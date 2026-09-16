# Ajustes no vídeo de demonstração

Dois pontos: a tela que aparece por volta dos 40 segundos mostra um painel técnico de depuração, e a narração soa mecânica.

## 1. Tirar o painel de depuração da cena

O bloco amarelo "DEBUG /lider/contexto" só existe no ambiente de desenvolvimento (é invisível para qualquer cliente). Como a gravação foi feita nesse ambiente, ele entrou na imagem.

Correção: regravar apenas a cena do Feed de contexto com esse bloco oculto durante a captura, começando o enquadramento já na linha do tempo de evidências. Nenhuma mudança no produto, apenas na gravação.

Enquanto reviso essa cena, confiro também as outras quatro telas quadro a quadro, para garantir que nenhum aviso técnico, banner ou tooltip fora de lugar apareça.

## 2. Voz mais natural

Duas opções, e eu recomendo tentar a primeira antes de gastar seu tempo:

- **Refazer aqui (recomendado):** regerar os oito trechos com direção de interpretação mais humana (ritmo mais lento, pausas naturais, tom executivo em português do Brasil) e testar duas vozes diferentes antes de escolher. O custo é baixo, é uma fração do que já foi usado no vídeo inteiro.
- **ElevenLabs:** se mesmo assim a voz não convencer, entrego o roteiro completo em um documento com a fala de cada trecho, o texto exato das legendas e a minutagem de início e fim de cada bloco, pronto para você gravar e me devolver os áudios — eu remonto o vídeo com eles.

Vou entregar o documento do roteiro de qualquer forma, junto com o vídeo, para você ter o material em mãos.

## 3. Entrega

Nova versão do vídeo (85 segundos, 1920x1080) com narração e a versão sem narração, além do documento com roteiro, legendas e minutagem.

## Detalhes técnicos

- Regravação via Playwright em `/tmp/browser/demo/rec_contexto.py`, ocultando `DebugContextoBanner` por CSS na captura; novos quadros em `/tmp/remotion/public/frames/contexto/`.
- Narração pelo gateway de IA (`gpt-4o-mini-tts`) com `instructions` de entonação; amostra de duas vozes antes de regerar os oito trechos.
- Render da composição `main` em `/tmp/remotion`, muxagem da narração com ffmpeg e cópia final para os arquivos do projeto.
- O workspace de demonstração (Nordvale Logística) segue ativo até você aprovar esta versão.
