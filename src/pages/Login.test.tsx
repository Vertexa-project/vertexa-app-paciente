import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Login from "./Login";

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

// Sem VITE_AUTH_MODE=real nos testes, `isRealAuth` é false -> entra o DemoLogin, que é
// justamente a tela onde o botão vivia. Se ele voltar, é aqui que aparece.
describe("Login — não promete recuperação de senha que não existe (WP-APP-4 item 3)", () => {
  it("não há botão 'Esqueci minha senha'", () => {
    renderLogin();
    expect(screen.queryByText(/esqueci minha senha/i)).not.toBeInTheDocument();
  });

  // Guarda mais larga que a anterior: qualquer reformulação do MESMO botão ("Recuperar senha",
  // "Redefinir minha senha") cai aqui. Não existe credencial de senha neste produto — o
  // AuthContext expõe só signInWithGoogle/signOut.
  it("nenhuma variante de recuperar/redefinir senha na tela", () => {
    renderLogin();
    expect(screen.queryByText(/(recuperar|redefinir|esqueci).*senha/i)).not.toBeInTheDocument();
  });

  it("a entrada por Google continua de pé", () => {
    renderLogin();
    expect(screen.getByText("Google")).toBeInTheDocument();
  });
});
