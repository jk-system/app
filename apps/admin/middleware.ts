import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware de sessao da Central Admin.
 *
 * - Atualiza (refresh) o cookie de sessao do Supabase em toda navegacao.
 * - Redireciona para /login quem nao estiver autenticado (exceto na propria
 *   /login e em assets estaticos).
 *
 * A checagem de "esse usuario e um admin da JK?" (tabela jk_admins) NAO
 * acontece aqui — acontece no layout do grupo de rotas protegidas
 * (app/(app)/layout.tsx), que ja tem acesso ao service_role client.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - arquivos estaticos do Next (_next/static, _next/image)
     * - favicon e outros assets em /public (svg, png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
