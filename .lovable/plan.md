## Trocar foto do Ato 1 (Onboarding) na SarahJourneySection

O Ato 1 hoje reusa `src/assets/landing-cinematic-office.jpg`, que é a mesma foto da seção cinematográfica logo acima. Visualmente parece repetição.

### O que fazer

1. Gerar nova foto cinematográfica em `src/assets/landing/journey/journey-1-cafe-morning.jpg` via `imagegen` (modelo `standard`, 1600x900).
   - **Cena:** café aconchegante de manhã cedo, luz dourada entrando pela janela, silhueta de uma pessoa de costas sentada com laptop aberto, xícara fumegando ao lado, ambiente caloroso e acolhedor. Sem rostos identificáveis. Paleta âmbar/quente, tom editorial cinematográfico, profundidade de campo rasa.
   - Mantém o sentido de "primeira semana, começo de jornada, momento íntimo de chegada" sem repetir o escritório noturno.

2. Em `src/components/landing/SarahJourneySection.tsx`:
   - Remover o import `officeNight from "@/assets/landing-cinematic-office.jpg"`.
   - Adicionar `import cafeMorning from "@/assets/landing/journey/journey-1-cafe-morning.jpg"`.
   - No mapa `IMAGES`, trocar `slackDM: officeNight` por `slackDM: cafeMorning`.

### Fora do escopo

- Atos 2, 3 e 4 (fotos atuais ficam).
- Copy, layout, pager, mockups — intocados.
- Seção cinematográfica anterior — intocada (continua com `landing-cinematic-office.jpg`).
