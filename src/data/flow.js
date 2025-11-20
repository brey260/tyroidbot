export const flow = {
  start: {
    id: "start",
    type: "choice",
    message:
      "Buenas, estás dentro del Software de apoyo para la detección prematura del hipertiroidismo.\nRecuerda que esto NO reemplaza una valoración médica especializada.\n¿Deseas continuar?",
    options: [
      { value: "si", label: "Sí, deseo continuar" },
      { value: "no", label: "No, gracias" },
    ],
    next: "datos_generales_genero",
  },

  datos_generales_genero: {
    id: "datos_generales_genero",
    type: "choice",
    message: "¿Cuál es tu género?",
    options: [
      { value: "hombre", label: "Hombre" },
      { value: "mujer", label: "Mujer" },
    ],
    next: "datos_generales_edad",
  },

  datos_generales_edad: {
    id: "datos_generales_edad",
    type: "input",
    message: "¿Cuál es tu edad?",
    next: "datos_generales_antecedentes",
  },

  datos_generales_antecedentes: {
    id: "datos_generales_antecedentes",
    type: "choice",
    message: "¿Tu familia tiene antecedentes de alteraciones tiroideas?",
    options: [
      { value: "si", label: "Sí" },
      { value: "no", label: "No" },
      { value: "nolosé", label: "No lo sé" },
    ],
    next: "sintomas",
  },

  sintomas: {
    id: "sintomas",
    type: "multi-choice",
    message: "Selecciona los síntomas que presentas:",
    options: [
      { value: "perdida_peso", label: "Pérdida de peso sin motivo" },
      { value: "palpitaciones", label: "Palpitaciones o taquicardia" },
      { value: "nerviosismo", label: "Nerviosismo o ansiedad constante" },
      { value: "sudoracion", label: "Sudoración excesiva" },
      { value: "ojos_saltones", label: "Ojos más saltones o irritados" },
      { value: "temblores", label: "Temblores en las manos" },
      { value: "cansancio", label: "Cansancio o dificultad para dormir" },
      { value: "garganta", label: "Garganta inflamada" },
      { value: "apetito", label: "Aumento de apetito" },
      { value: "manos_calientes", label: "Manos calientes" },
    ],
    next: "lab_tienes",
  },

  lab_tienes: {
    id: "lab_tienes",
    type: "choice",
    message: "¿Tienes resultados de laboratorio (TSH, T3, T4)?",
    options: [
      { value: "si", label: "Sí, tengo resultados" },
      { value: "no", label: "No los tengo" },
    ],
    next: {
      si: "lab_tsh",
      no: "final",
    },
  },

  lab_tsh: {
    id: "lab_tsh",
    type: "input",
    message: "Ingresa tu valor de TSH (µU/mL):",
    next: "lab_t3",
  },

  lab_t3: {
    id: "lab_t3",
    type: "input",
    message: "Ingresa tu valor de T3 total (ng/mL):",
    next: "lab_t4",
  },

  lab_t4: {
    id: "lab_t4",
    type: "input",
    message: "Ingresa tu valor de T4 total (ng/mL):",
    next: "lab_ft3",
  },

  lab_ft3: {
    id: "lab_ft3",
    type: "input",
    message: "Ingresa tu valor de fT3 (pg/mL):",
    next: "lab_ft4",
  },

  lab_ft4: {
    id: "lab_ft4",
    type: "input",
    message: "Ingresa tu valor de fT4 (ng/dL):",
    next: "final",
  },
  //sdnajfjaf

  final: {
    id: "final",
    type: "final",
    message:
      "Gracias por compartir tu información.\nTus respuestas indican que podrías estar presentando signos compatibles con una alteración tiroidea.\n\nEsto NO es un diagnóstico.\n\nRecomendaciones:\n• Consulta un médico general o endocrinólogo.\n• Realiza una prueba de función tiroidea si aún no la tienes.\n• Evita automedicarte.\n• Si tus síntomas aumentan o afectan tu vida diaria, busca atención profesional.\n\nTu bienestar es importante. Cuida tu salud ❤️‍🩹",
    next: null,
  },
};
