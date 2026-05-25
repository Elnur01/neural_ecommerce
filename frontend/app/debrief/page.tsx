"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import tracker from "@/lib/tracker";

export default function DebriefPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [form, setForm] = useState({
    completed_purchase: null as boolean | null,
    mission_completed_self_report: "",
    abandonment_reason: "",
    abandonment_reason_other: "",
    mission_recall_text: "",
    scenario_realism_score: 0,
    overall_realism_score: 0,
    free_text: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lang = user?.scenario_text_lang || "en";

  useEffect(() => {
    // Attempt to end the session in tracker so it flushes
    tracker.track("survey_page_loaded");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/surveys", {
        session_id: tracker.getSessionId() || "00000000-0000-0000-0000-000000000000",
        scenario_id: user?.scenario_id,
        survey_lang: lang,
        intent_to_buy: user?.scenario_intent_level,
        ...form
      });
      // Also close the session on the backend
      if (tracker.getSessionId()) {
        await api.post(`/events/sessions/${tracker.getSessionId()}/close`);
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Survey submission failed", err);
      // Still show submitted to not block user
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "var(--gradient-subtle)" }}>
        <div className="card p-8 max-w-md text-center animate-slide-up">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--primary)" }}>
            {lang === "tr" ? "Teşekkürler!" : "Thank You!"}
          </h1>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            {lang === "tr" 
              ? "Araştırma çalışmamızı tamamladınız. Verileriniz başarıyla kaydedildi."
              : "You have completed the research study. Your data has been recorded successfully."}
          </p>
          <button onClick={() => window.location.href = "https://google.com"} className="btn btn-primary w-full">
            {lang === "tr" ? "Çıkış Yap" : "Exit Study"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12" style={{ background: "var(--gradient-subtle)" }}>
      <div className="w-full max-w-2xl card p-8 animate-slide-up">
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--primary)" }}>
          {lang === "tr" ? "Çalışma Sonu Anketi" : "Post-Session Survey"}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question 1 */}
          <div>
            <label className="block font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              {lang === "tr" ? "Bu oturumda bir ürün satın aldınız mı?" : "Did you purchase an item in this session?"}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="completed_purchase" checked={form.completed_purchase === true} onChange={() => setForm({...form, completed_purchase: true})} required />
                {lang === "tr" ? "Evet" : "Yes"}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="completed_purchase" checked={form.completed_purchase === false} onChange={() => setForm({...form, completed_purchase: false})} required />
                {lang === "tr" ? "Hayır" : "No"}
              </label>
            </div>
          </div>

          {/* Conditional Question 2 (Purchased) */}
          {form.completed_purchase === true && (
            <div className="animate-fade-in">
              <label className="block font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                {lang === "tr" ? "Size verilen alışveriş görevini ne ölçüde tamamladığınızı düşünüyorsunuz?" : "To what extent do you feel you completed your assigned shopping task?"}
              </label>
              <select className="input w-full" value={form.mission_completed_self_report} onChange={(e) => setForm({...form, mission_completed_self_report: e.target.value})} required>
                <option value="">{lang === "tr" ? "Seçiniz..." : "Select..."}</option>
                <option value="Yes">{lang === "tr" ? "Tamamen" : "Fully"}</option>
                <option value="Partially">{lang === "tr" ? "Kısmen" : "Partially"}</option>
                <option value="No">{lang === "tr" ? "Hayır, başka bir şey aldım" : "No, I bought something else"}</option>
                <option value="Forgot">{lang === "tr" ? "Görevi unuttum" : "I forgot the task"}</option>
              </select>
            </div>
          )}

          {/* Conditional Question 2 (Not Purchased) */}
          {form.completed_purchase === false && (
            <div className="animate-fade-in">
              <label className="block font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                {lang === "tr" ? "Neden alışverişi tamamlamadan ayrıldınız?" : "Why did you leave without completing a purchase?"}
              </label>
              <select className="input w-full" value={form.abandonment_reason} onChange={(e) => setForm({...form, abandonment_reason: e.target.value})} required>
                <option value="">{lang === "tr" ? "Seçiniz..." : "Select..."}</option>
                <option value="Prices too high">{lang === "tr" ? "Fiyatlar çok yüksekti" : "Prices were too high"}</option>
                <option value="Didn't find what I wanted">{lang === "tr" ? "Aradığımı bulamadım" : "Didn't find what I wanted"}</option>
                <option value="Changed mind">{lang === "tr" ? "Fikrimi değiştirdim" : "Changed my mind"}</option>
                <option value="Other">{lang === "tr" ? "Diğer" : "Other"}</option>
              </select>
              {form.abandonment_reason === "Other" && (
                <input type="text" className="input w-full mt-2" placeholder={lang === "tr" ? "Lütfen belirtin" : "Please specify"} value={form.abandonment_reason_other} onChange={(e) => setForm({...form, abandonment_reason_other: e.target.value})} required />
              )}
            </div>
          )}

          {/* Question 3 */}
          <div>
            <label className="block font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              {lang === "tr" ? "Lütfen oturumun başında size verilen alışveriş görevini kısaca kendi cümlelerinizle yazın:" : "Please briefly write out the shopping task you were assigned at the start of the session in your own words:"}
            </label>
            <textarea className="input w-full h-24" value={form.mission_recall_text} onChange={(e) => setForm({...form, mission_recall_text: e.target.value})} required></textarea>
          </div>

          {/* Question 4 & 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium mb-2 text-sm" style={{ color: "var(--text-primary)" }}>
                {lang === "tr" ? "Size verilen senaryonun gerçekçiliği (1-5)" : "Realism of the assigned scenario (1-5)"}
              </label>
              <div className="flex justify-between max-w-[200px]">
                {[1, 2, 3, 4, 5].map(score => (
                  <label key={score} className="flex flex-col items-center cursor-pointer">
                    <input type="radio" name="scenario_realism" checked={form.scenario_realism_score === score} onChange={() => setForm({...form, scenario_realism_score: score})} required />
                    <span className="text-xs mt-1">{score}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-medium mb-2 text-sm" style={{ color: "var(--text-primary)" }}>
                {lang === "tr" ? "Alışveriş platformunun genel gerçekçiliği (1-5)" : "Overall realism of the shopping platform (1-5)"}
              </label>
              <div className="flex justify-between max-w-[200px]">
                {[1, 2, 3, 4, 5].map(score => (
                  <label key={score} className="flex flex-col items-center cursor-pointer">
                    <input type="radio" name="overall_realism" checked={form.overall_realism_score === score} onChange={() => setForm({...form, overall_realism_score: score})} required />
                    <span className="text-xs mt-1">{score}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Question 6 */}
          <div>
            <label className="block font-medium mb-2" style={{ color: "var(--text-primary)" }}>
              {lang === "tr" ? "Eklemek istediğiniz başka bir şey var mı? (İsteğe bağlı)" : "Anything else you'd like to add? (Optional)"}
            </label>
            <textarea className="input w-full h-16" value={form.free_text} onChange={(e) => setForm({...form, free_text: e.target.value})}></textarea>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "..." : (lang === "tr" ? "Yanıtları Gönder" : "Submit Responses")}
          </button>
        </form>
      </div>
    </div>
  );
}
