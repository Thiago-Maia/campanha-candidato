/* =============================================================================
   CONFIGURAÇÃO DA CAMPANHA
   -----------------------------------------------------------------------------
   Este é o ÚNICO arquivo que precisa ser editado para adaptar o site a um
   candidato. Nome, cores, textos e molduras saem todos daqui.
   Depois de editar, salve e recarregue a página (Ctrl+F5).
   ========================================================================== */

window.CAMPAIGN_CONFIG = {

  /* ---------------------------------------------------------------------------
     1. DADOS DO CANDIDATO
     Usados nos textos da página e também dentro das molduras de exemplo (.svg).
     Quando as artes definitivas em PNG chegarem, esses valores deixam de
     aparecer na moldura (a arte já vem com o nome desenhado).
     ------------------------------------------------------------------------ */
  candidate: {
    name: 'Nome do Candidato',
    number: '00000',
    party: 'PARTIDO',
    slogan: 'O trabalho que continua'
  },

  /* ---------------------------------------------------------------------------
     2. METADADOS (aba do navegador e compartilhamento em redes sociais)
     ------------------------------------------------------------------------ */
  meta: {
    title: 'Crie sua foto de apoio',
    description: 'Escolha sua foto, ajuste o enquadramento e baixe sua imagem pronta.',
    shareUrl: '',   // ex.: 'https://seusite.com.br/campanha/'
    ogImage: ''     // ex.: 'https://seusite.com.br/campanha/assets/og.jpg'
  },

  /* ---------------------------------------------------------------------------
     3. CORES (aceita qualquer cor CSS: #hex, rgb(), etc.)
     ------------------------------------------------------------------------ */
  theme: {
    primary:     '#0f5f9e',  // cor principal: botões, destaques
    primaryDark: '#0a3f6d',  // tom escuro: títulos e hover
    primarySoft: '#e9f2fa',  // fundo suave de apoio
    accent:      '#f3c04a',  // cor de destaque (número, selo)
    ink:         '#16323f',  // cor do texto principal
    muted:       '#61798a',  // cor do texto secundário
    line:        '#dbe6ee',  // bordas
    surface:     '#ffffff',  // fundo dos cards
    background:  '#f2f7fb'   // fundo da página
  },

  /* ---------------------------------------------------------------------------
     4. MOLDURAS
     Cada item vira uma miniatura selecionável. Aceita .svg (modelo de exemplo,
     preenchido com os dados do candidato) ou .png (arte final do designer).
     A arte final deve ser QUADRADA, 1000x1000 px, com a área do rosto
     TRANSPARENTE. Para trocar: coloque o arquivo em assets/ e mude o "src".
     ------------------------------------------------------------------------ */
  frames: [
    { id: 'm1', label: 'Moldura 1', src: 'assets/moldura1.svg' },
    { id: 'm2', label: 'Moldura 2', src: 'assets/moldura2.svg' },
    { id: 'm3', label: 'Moldura 3', src: 'assets/moldura3.svg' }
  ],

  /* ---------------------------------------------------------------------------
     5. ARQUIVO GERADO
     ------------------------------------------------------------------------ */
  export: {
    size: 1000,                    // resolução final em px (quadrado)
    filename: 'foto-de-apoio.png',
    mime: 'image/png'
  },

  /* ---------------------------------------------------------------------------
     6. TEXTOS DA PÁGINA
     ------------------------------------------------------------------------ */
  texts: {
    eyebrow: 'Campanha oficial',
    headline: 'Crie sua foto de apoio',
    subhead: 'Escolha sua foto, ajuste o enquadramento e baixe sua imagem pronta.',
    privacyNote: 'Sua foto é processada somente no seu dispositivo e não é enviada para nenhum servidor.',
    tip: 'fotos verticais, com o rosto centralizado, costumam oferecer o melhor enquadramento.',
    steps: [
      { title: 'Escolha uma foto',       text: 'Use uma imagem clara e de boa qualidade.' },
      { title: 'Ajuste o enquadramento', text: 'Arraste para posicionar seu rosto na área livre.' },
      { title: 'Controle o zoom',        text: 'Aproxime até encontrar o melhor resultado.' },
      { title: 'Baixe e compartilhe',    text: 'Salve a imagem pronta no seu aparelho.' }
    ]
  },

  /* ---------------------------------------------------------------------------
     7. RODAPÉ (deixe em branco para esconder)
     ------------------------------------------------------------------------ */
  footer: {
    text: '',        // ex.: 'Desenvolvido por'
    linkLabel: '',   // ex.: 'Sua Agência'
    linkUrl: ''      // ex.: 'https://suaagencia.com.br'
  },

  /* ---------------------------------------------------------------------------
     8. IDENTIFICAÇÃO ELEITORAL
     Preencha antes de publicar. A legislação eleitoral exige a identificação
     do responsável pela propaganda. Confirme o texto exato com o advogado
     da campanha.
     ------------------------------------------------------------------------ */
  legal: {
    disclaimer: ''
  }
};
