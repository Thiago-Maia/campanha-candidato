# Crie sua foto de apoio

Gerador de foto de apoio (moldura de campanha) para o eleitor: ele escolhe uma foto,
ajusta o enquadramento e baixa a imagem pronta em PNG 1000×1000.

**A foto nunca sai do dispositivo.** Todo o processamento acontece no navegador,
com `<canvas>`. Não há backend, banco de dados nem upload.

Site estático puro: HTML + CSS + JavaScript, sem framework e sem etapa de build.

```
index.html
css/style.css
js/config.js     <- único arquivo que você edita
js/app.js
assets/moldura1.svg, moldura2.svg, moldura3.svg, favicon.svg
netlify.toml
```

## 1. Rodar na sua máquina

Precisa ser por servidor local — abrir o `index.html` direto (`file://`) faz o
navegador bloquear a geração da imagem final.

```bash
python -m http.server 8080
```

Depois abra <http://localhost:8080>.

## 2. Trocar a identidade da campanha

Tudo em [`js/config.js`](js/config.js):

| Seção | O que muda |
|---|---|
| `candidate` | nome, número, partido e slogan |
| `meta` | título da aba e textos de compartilhamento |
| `theme` | cores do site (botões, títulos, fundo) |
| `frames` | quais molduras aparecem e em que ordem |
| `export` | resolução e nome do arquivo baixado |
| `texts` | todos os textos da página |
| `footer` | crédito no rodapé (vazio = escondido) |
| `legal` | identificação exigida pela legislação eleitoral |

Salve e recarregue a página com Ctrl+F5.

## 3. Colocar as molduras definitivas

As três molduras atuais são **modelos de exemplo em SVG**, geradas a partir dos dados
do `config.js` só para o MVP funcionar enquanto a arte do designer não chega.

Para usar a arte real:

1. Exporte cada arte como **PNG quadrado de 1000×1000 px**, com a área do rosto
   **transparente** (é por ali que a foto do eleitor aparece).
2. Copie os arquivos para `assets/`.
3. Aponte para eles em `js/config.js`:

```js
frames: [
  { id: 'm1', label: 'Vem com a gente', src: 'assets/moldura1.png' },
  { id: 'm2', label: 'Apoio oficial',   src: 'assets/moldura2.png' }
]
```

Pode haver quantas molduras quiser — cada item vira uma miniatura. Se a arte
final tiver outra resolução (ex.: 1080×1080), ajuste também `export.size`.

> Dica de arte: deixe a metade superior livre. É onde o rosto costuma cair.

## 4. Publicar de graça

**Netlify (mais rápido, sem instalar nada):** acesse <https://app.netlify.com/drop>
e arraste a pasta do projeto para a página. O `netlify.toml` já está configurado.
Para atualizar depois, arraste a pasta de novo no mesmo site.

**GitHub Pages:** suba a pasta para um repositório e ative
*Settings → Pages → Deploy from a branch* (branch `main`, pasta `/root`).

**Hospedagem própria:** copie os arquivos para uma subpasta do domínio da campanha
(ex.: `public_html/campanha/`) via FTP ou cPanel. Funciona em qualquer servidor,
porque não há backend.

## 5. Antes de divulgar

- [ ] Preencher `legal.disclaimer` com a identificação exigida pela legislação
      eleitoral (confirme o texto com o advogado da campanha).
- [ ] Substituir as molduras de exemplo pelas artes oficiais.
- [ ] Testar em um celular Android e em um iPhone.
- [ ] Conferir `meta.shareUrl` e `meta.ogImage` para o link ficar bonito no WhatsApp.

## Compatibilidade

Chrome, Edge, Firefox e Safari atuais (desktop e mobile). No celular, quando o
sistema permite, aparece também um botão **Compartilhar**, que envia a imagem
direto para WhatsApp/Instagram sem passar pela galeria.
