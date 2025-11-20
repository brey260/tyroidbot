import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Stethoscope, Loader2, Send, RotateCcw, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import MessageBubble from "./MessageBubble";
import OptionButtons from "./OptionButtons";
import ResultCard from "./ResultCard";
import { flow } from "../data/flow";

const INITIAL_STEP = "start";

const createInitialAnswers = () => ({
  datos_generales_genero: null,
  datos_generales_edad: null,
  datos_generales_antecedentes: null,
  sintomas: [],
  lab_tienes: null,
  lab_tsh: null,
  lab_t3: null,
  lab_t4: null,
  lab_ft3: null,
  lab_ft4: null,
});

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [currentStepId, setCurrentStepId] = useState(INITIAL_STEP);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [answers, setAnswers] = useState(createInitialAnswers);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [summary, setSummary] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const messagesEndRef = useRef(null);

  const currentStep = useMemo(
    () => flow[currentStepId] ?? null,
    [currentStepId]
  );

  // Auto-scroll cada vez que entran mensajes nuevos
  useEffect(() => {
    const timeout = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100); // tiempo pequeño para que el DOM pinte

    return () => clearTimeout(timeout);
  }, [messages]);

  /* ---------- INTERPRETACIONES ---------- */

  const interpretarSintomas = (lista) => {
    const count = lista?.length || 0;

    if (count === 0)
      return {
        puntaje: 0,
        riesgo: "BAJO",
        texto: "No reportaste síntomas en este momento.",
      };

    if (count <= 2)
      return {
        puntaje: count,
        riesgo: "BAJO",
        texto:
          "Reportas pocos síntomas. Aun así, es recomendable estar atento a su evolución.",
      };

    if (count <= 5)
      return {
        puntaje: count,
        riesgo: "MODERADO",
        texto:
          "Tienes varios síntomas que pueden ser compatibles con hipertiroidismo. Es recomendable consultar con un profesional de la salud.",
      };

    return {
      puntaje: count,
      riesgo: "ALTO",
      texto:
        "Presentas numerosos síntomas compatibles con una alteración tiroidea. Sería importante solicitar una valoración médica pronto.",
    };
  };

  const interpretarLaboratorios = (ans) => {
    const tsh = parseFloat(ans.lab_tsh);
    const t3 = parseFloat(ans.lab_t3);
    const t4 = parseFloat(ans.lab_t4);
    const ft3 = parseFloat(ans.lab_ft3);
    const ft4 = parseFloat(ans.lab_ft4);

    let riesgo = "BAJO";
    const observaciones = [];
    const valores = [];

    const pushValor = (id, label, valor, min, max, unidad) => {
      if (isNaN(valor)) return;
      valores.push({ id, label, valor, min, max, unidad });
    };

    // Rangos aproximados (de tu Word)
    if (!isNaN(tsh)) {
      pushValor("TSH", "TSH", tsh, 0.2, 4.2, "µU/mL");
      if (tsh < 0.2) {
        riesgo = "ALTO";
        observaciones.push("TSH baja: puede sugerir hipertiroidismo.");
      } else if (tsh > 4.2) {
        riesgo = riesgo === "ALTO" ? "ALTO" : "MODERADO";
        observaciones.push("TSH elevada: puede sugerir hipotiroidismo u otra alteración tiroidea.");
      }
    }

    if (!isNaN(t3)) {
      pushValor("T3", "T3 total", t3, 0.8, 1.8, "ng/mL");
      if (t3 > 1.8) {
        riesgo = "ALTO";
        observaciones.push("T3 total elevada.");
      }
    }

    if (!isNaN(t4)) {
      pushValor("T4", "T4 total", t4, 4, 11, "ng/mL");
      if (t4 > 11) {
        riesgo = "ALTO";
        observaciones.push("T4 total elevada.");
      }
    }

    if (!isNaN(ft3)) {
      pushValor("fT3", "fT3", ft3, 2.6, 5.1, "pg/mL");
      if (ft3 > 5.1) {
        riesgo = "ALTO";
        observaciones.push("fT3 elevada.");
      }
    }

    if (!isNaN(ft4)) {
      pushValor("fT4", "fT4", ft4, 0.93, 1.71, "ng/dL");
      if (ft4 > 1.71) {
        riesgo = "ALTO";
        observaciones.push("fT4 elevada.");
      }
    }

    if (observaciones.length === 0) {
      return {
        riesgo: "BAJO",
        texto:
          "Los valores que registraste se encuentran dentro de rangos de referencia aproximados o sin alteraciones marcadas.",
        valores,
      };
    }

    return {
      riesgo,
      texto: observaciones.join("\n"),
      valores,
    };
  };

  const construirResumen = (ans) => {
    const sintomasEval = interpretarSintomas(ans.sintomas || []);
    const labsEval = ans.lab_tsh ? interpretarLaboratorios(ans) : null;

    const riesgoFinal =
      labsEval?.riesgo === "ALTO" || sintomasEval.riesgo === "ALTO"
        ? "ALTO"
        : labsEval?.riesgo === "MODERADO" || sintomasEval.riesgo === "MODERADO"
          ? "MODERADO"
          : "BAJO";

    // Texto tipo chat (el que te gustó)
    let fullText = "Gracias por compartir tu información.\n\n";
    fullText += `🟦 **Evaluación por síntomas** (${sintomasEval.puntaje} síntomas)\n${sintomasEval.texto}\n\n`;

    if (labsEval) {
      fullText += `🟧 **Interpretación de laboratorios**\n${labsEval.texto}\n\n`;
    }

    fullText += `🟥 **Nivel de riesgo estimado:** ${riesgoFinal}\n\n`;
    fullText +=
      "⚠️ *Este resultado NO es un diagnóstico médico.*\n\n" +
      "Recomendaciones:\n" +
      "• Consulta un médico general o endocrinólogo.\n" +
      "• No te automediques.\n" +
      "• Si tus síntomas aumentan o te afectan, busca atención profesional.\n\n" +
      "Tu bienestar es importante ❤️‍🩹";

    return {
      fullText,
      riesgoFinal,
      sintomasEval,
      labsEval,
    };
  };

  /* ---------- FLUJO DEL CHAT ---------- */

  const iniciarChat = () => {
    setMessages([
      {
        id: `bot-start-${Date.now()}`,
        from: "bot",
        text: flow[INITIAL_STEP].message,
        stepId: INITIAL_STEP,
      },
    ]);
    setCurrentStepId(INITIAL_STEP);
    setUserInput("");
    setIsTyping(false);
    setSelectedSymptoms([]);
    setSummary(null);
    setAnswers(createInitialAnswers());
  };

  useEffect(() => {
    iniciarChat();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isTyping]);

  const sendBotMessageForStep = (stepId, answersSnapshot) => {
    const step = flow[stepId];
    if (!step) return;

    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      let text = step.message;

      // Si es el final, construir resumen dinámico
      if (stepId === "final") {
        const resumen = construirResumen(answersSnapshot);
        text = resumen.fullText;
        setSummary({
          risk: resumen.riesgoFinal,
          sintomas: resumen.sintomasEval,
          labs: resumen.labsEval,
          answers: answersSnapshot,
          createdAt: new Date(),
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${step.id}-${Date.now()}`,
          from: "bot",
          text,
          stepId: step.id,
        },
      ]);
      setCurrentStepId(step.id);
    }, 500);
  };

  const processNextStep = (stepId, value) => {
    const step = flow[stepId];
    if (!step) return;

    const updatedAnswers = { ...answers, [stepId]: value };
    setAnswers(updatedAnswers);
    setUserInput("");

    if (step.id === "lab_tienes") {
      const nextId = step.next[value];
      if (nextId) sendBotMessageForStep(nextId, updatedAnswers);
      return;
    }

    if (step.next) {
      sendBotMessageForStep(step.next, updatedAnswers);
    }
  };

  const handleUserMessage = (displayText, rawValue) => {
    if (!currentStep) return;
    if (!displayText || !displayText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        from: "user",
        text: displayText.trim(),
        stepId: currentStep.id,
      },
    ]);

    processNextStep(currentStep.id, rawValue);
  };

  /* ---------- HANDLERS DE UI ---------- */

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep?.type !== "input") return;
    const trimmed = userInput.trim();
    if (!trimmed) return;
    handleUserMessage(trimmed, trimmed);
  };

  const handleOptionChoice = (value) => {
    const opt = currentStep.options?.find((o) => o.value === value);
    const label = opt?.label || value;
    handleUserMessage(label, value);
  };

  const handleToggleSymptom = (value) => {
    setSelectedSymptoms((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmitSymptoms = () => {
    if (!selectedSymptoms.length) return;

    const labels = currentStep.options
      .filter((opt) => selectedSymptoms.includes(opt.value))
      .map((opt) => opt.label);

    const summaryText = `Síntomas seleccionados: ${labels.join(", ")}`;
    handleUserMessage(summaryText, selectedSymptoms);
    setSelectedSymptoms([]);
  };

  const handleDownloadPdf = () => {
    if (!summary) return;

    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(14);
    doc.text("Resultado orientativo - Asistente de Hipertiroidismo", 10, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, y);
    y += 6;

    const a = summary.answers || {};

    doc.text(
      `Género: ${a.datos_generales_genero || "-"}   Edad: ${a.datos_generales_edad || "-"
      }`,
      10,
      y
    );
    y += 6;
    doc.text(
      `Antecedentes tiroideos: ${a.datos_generales_antecedentes || "-"}`,
      10,
      y
    );
    y += 8;

    doc.setFontSize(11);
    doc.text(`Nivel de riesgo estimado: ${summary.risk}`, 10, y);
    y += 6;

    doc.setFontSize(10);
    doc.text("Evaluación por síntomas:", 10, y);
    y += 5;
    doc.text(summary.sintomas.texto || "", 10, y, { maxWidth: 190 });
    y += 18;

    if (summary.labs) {
      doc.text("Interpretación de laboratorios:", 10, y);
      y += 5;
      doc.text(summary.labs.texto || "", 10, y, { maxWidth: 190 });
      y += 18;

      if (summary.labs.valores?.length) {
        doc.text("Valores registrados:", 10, y);
        y += 5;
        summary.labs.valores.forEach((v) => {
          doc.text(
            `• ${v.label}: ${v.valor} ${v.unidad} (ref: ${v.min} - ${v.max})`,
            12,
            y
          );
          y += 5;
        });
      }
    }

    y += 8;
    doc.setFontSize(9);
    doc.text(
      "Este documento es solo orientativo y no reemplaza una valoración médica.",
      10,
      y,
      { maxWidth: 190 }
    );

    doc.save("resultado_hipertiroidismo.pdf");
  };

  const isFinalStep = currentStep?.type === "final";
  const isSymptomsStep = currentStep?.id === "sintomas";

  /* ---------- RENDER ---------- */

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/95">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center">
            <Activity className="text-sky-400" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-semibold text-slate-50">
              Asistente de Hipertiroidismo
            </span>
            <span className="text-[11px] text-slate-400">
              Herramienta de apoyo — No reemplaza una consulta médica
            </span>
          </div>
        </div>
        <Stethoscope className="text-slate-400" size={20} />
      </div>

      {/* MENSAJES */}
      <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 bg-linear-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} from={msg.from} text={msg.text} />
          ))}

          {/* Bot typing */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex justify-start mb-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 text-xs">
                    <Loader2 className="animate-spin" size={16} />
                  </div>
                  <div className="px-3 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
                    Analizando tus respuestas…
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Opciones */}
          {currentStep?.options && currentStep.type === "choice" && (
            <OptionButtons
              options={currentStep.options}
              multiSelect={false}
              selectedValues={[]}
              onClick={handleOptionChoice}
            />
          )}

          {currentStep?.options && currentStep.type === "multi-choice" && (
            <OptionButtons
              options={currentStep.options}
              multiSelect
              selectedValues={selectedSymptoms}
              onClick={handleToggleSymptom}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* BARRA INFERIOR */}
      <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur px-3 sm:px-4 py-2 sm:py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {isFinalStep ? (
            <>
              <ResultCard summary={summary} />

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 transition-colors"
                  >
                    <FileDown size={14} />
                    Descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={iniciarChat}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 text-slate-200 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 hover:border-sky-400 hover:text-sky-200 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Reiniciar chat
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Este resultado es orientativo. Ante cualquier duda, consulta a un profesional.
                </p>
              </div>
            </>
          ) : isSymptomsStep ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] sm:text-xs text-slate-400">
                Selecciona uno o más síntomas y luego confirma para continuar.
              </p>
              <button
                type="button"
                onClick={handleSubmitSymptoms}
                disabled={selectedSymptoms.length === 0 || isTyping}
                className="inline-flex items-center justify-center w-full sm:w-auto rounded-full bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-semibold px-4 py-2 transition-colors disabled:opacity-60"
              >
                <Send size={14} className="mr-1.5" />
                Confirmar síntomas
              </button>
            </div>
          ) : currentStep?.type === "input" ? (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isTyping}
                className="flex-1 rounded-2xl bg-slate-900/70 border border-slate-700/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-500/80"
                placeholder="Escribe tu respuesta aquí..."
              />
              <button
                type="submit"
                disabled={isTyping || !userInput.trim()}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 hover:bg-sky-600 text-white p-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p className="text-[11px] sm:text-xs text-slate-500 text-center">
              Selecciona una de las opciones para continuar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
