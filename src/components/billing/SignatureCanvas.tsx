"use client";

import { useRef, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface SignatureCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: { signature: string; signer_email: string; signer_name?: string; consent_given: boolean; consent_text: string }) => void;
  title?: string;
  clientEmail?: string;  // Email du client pour validation
  token?: string;  // Token public du devis pour l'OTP
}

export function SignatureCanvas({ isOpen, onClose, onSave, title = "Signer le document", clientEmail, token }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  
  // États pour la validation OTP
  const [otpStep, setOtpStep] = useState<"email" | "otp" | "signature">("email");
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const consentText = "En signant ce devis, je confirme avoir lu et accepté les conditions générales de vente. Je comprends que cette signature électronique a la même valeur légale qu'une signature manuscrite.";

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    // Réinitialiser les champs
    setHasSignature(false);
    setSignerEmail("");
    setSignerName("");
    setConsentGiven(false);
    setOtpStep("email");
    setOtpCode("");
    setOtpVerified(false);
    setErrorMessage(null);

    // Attendre que le canvas soit rendu pour obtenir sa taille réelle
    const setupCanvas = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Obtenir la taille d'affichage CSS du canvas
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || 600;
      const displayHeight = 200;
      
      // Utiliser la même taille pour le canvas réel et l'affichage
      // Cela évite les problèmes de coordonnées
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      // S'assurer que la taille CSS correspond à la taille réelle
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Configuration du contexte
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Réinitialiser le canvas
      ctx.clearRect(0, 0, displayWidth, displayHeight);
    };

    // Essayer immédiatement, puis avec un délai pour s'assurer que le canvas est rendu
    setupCanvas();
    const timeoutId = setTimeout(setupCanvas, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if ("touches" in e) {
      // Événement tactile
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Événement souris
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculer les coordonnées relatives au canvas
    // La modal est en fixed, donc pas besoin de tenir compte du scroll
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    
    // Si le canvas a une taille différente de sa taille d'affichage, ajuster
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    x = x * scaleX;
    y = y * scaleY;
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const { x, y } = getCoordinates(e);
    // S'assurer que les coordonnées sont dans les limites du canvas
    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));
    
    ctx.beginPath();
    ctx.moveTo(clampedX, clampedY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    // S'assurer que les coordonnées sont dans les limites du canvas
    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));
    
    ctx.lineTo(clampedX, clampedY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Fonction pour masquer partiellement l'email
  const maskEmail = (email: string): string => {
    if (!email || email.length < 5) return email;
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) return email;
    const masked = localPart.substring(0, 2) + "...." + localPart.slice(-2);
    return `${masked}@${domain}`;
  };

  const handleSendOtp = async () => {
    setErrorMessage(null);
    
    if (!signerEmail.trim()) {
      setErrorMessage("Veuillez renseigner votre adresse email");
      return;
    }
    
    // Valider que l'email correspond au client
    if (clientEmail && signerEmail.trim().toLowerCase() !== clientEmail.toLowerCase().trim()) {
      const maskedEmail = maskEmail(clientEmail);
      setErrorMessage(`L'email saisi ne correspond pas à l'email du client (${maskedEmail}). Veuillez utiliser l'email du client pour signer ce devis.`);
      return;
    }
    
    if (!token) {
      setErrorMessage("Token manquant");
      return;
    }
    
    setIsSendingOtp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/quotes/public/${token}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: signerEmail.trim().toLowerCase() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Erreur lors de l'envoi du code" }));
        const errorMsg = errorData.detail || "Erreur lors de l'envoi du code";
        // Masquer l'email dans le message d'erreur si présent
        const maskedErrorMsg = errorMsg.replace(clientEmail || "", maskEmail(clientEmail || ""));
        throw new Error(maskedErrorMsg);
      }
      
      setOtpStep("otp");
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Erreur lors de l'envoi de l'OTP:", err);
      let errorMsg = err.message || "Erreur lors de l'envoi du code";
      // Masquer l'email dans le message d'erreur si présent
      if (clientEmail && errorMsg.includes(clientEmail)) {
        errorMsg = errorMsg.replace(clientEmail, maskEmail(clientEmail));
      }
      setErrorMessage(errorMsg);
    } finally {
      setIsSendingOtp(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage("Veuillez entrer un code de 6 chiffres");
      return;
    }
    
    if (!token) {
      setErrorMessage("Token manquant");
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/quotes/public/${token}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: signerEmail.trim().toLowerCase(),
          code: otpCode.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Code invalide" }));
        throw new Error(errorData.detail || "Code invalide");
      }
      
      setOtpVerified(true);
      setOtpStep("signature");
      setErrorMessage(null);
    } catch (err: any) {
      console.error("Erreur lors de la vérification de l'OTP:", err);
      setErrorMessage(err.message || "Code invalide ou expiré");
      setOtpCode("");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSave = () => {
    setErrorMessage(null);
    
    if (!otpVerified) {
      setErrorMessage("Vous devez d'abord valider votre email avec le code OTP");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      setErrorMessage("Veuillez signer avant de sauvegarder");
      return;
    }
    
    if (!consentGiven) {
      setErrorMessage("Veuillez accepter les conditions pour signer");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    onSave({
      signature: dataUrl,
      signer_email: signerEmail.trim(),
      signer_name: signerName.trim() || undefined,
      consent_given: true,
      consent_text: consentText
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {/* Message d'erreur */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-md mx-auto mb-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}
      
      {/* Étape 1: Email */}
      {otpStep === "email" && (
        <div className="flex flex-col space-y-4 max-w-md mx-auto px-6 py-4">
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#F97316]/10 to-[#EA580C]/10 mb-3">
              <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Validation de l'email</h3>
            <p className="text-sm text-[#64748B]">Entrez votre adresse email pour recevoir un code de validation</p>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Email du signataire *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] pl-10 pr-4 py-3 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:ring-offset-0 bg-white transition-all"
                placeholder="votre.email@exemple.fr"
                required
                disabled={isSendingOtp}
              />
            </div>
          </div>
          <button
            onClick={handleSendOtp}
            disabled={!signerEmail.trim() || isSendingOtp}
            className="w-full px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {isSendingOtp ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi en cours...
              </span>
            ) : (
              "Envoyer le code de validation"
            )}
          </button>
        </div>
      )}
        
        {/* Étape 2: Code OTP */}
        {otpStep === "otp" && (
          <div className="flex flex-col space-y-4 max-w-md mx-auto px-6 py-4">
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#F97316]/10 to-[#EA580C]/10 mb-3">
                <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Code de validation</h3>
              <p className="text-sm text-[#64748B]">
                Un code a été envoyé à <span className="font-medium text-[#0F172A]">{signerEmail}</span>
              </p>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-[#0F172A] mb-2 text-center">
                Code de validation (6 chiffres) *
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(value);
                }}
                className="w-full rounded-lg border-2 border-[#E5E7EB] px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono font-semibold focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:ring-offset-0 bg-white transition-all"
                placeholder="000000"
                maxLength={6}
                required
                disabled={isVerifyingOtp}
              />
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setOtpStep("email");
                  setOtpCode("");
                }}
                className="flex-1 px-4 py-3 text-sm font-medium text-[#64748B] border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
              >
                Retour
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={otpCode.trim().length !== 6 || isVerifyingOtp}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
              >
                {isVerifyingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Vérification...
                  </span>
                ) : (
                  "Valider le code"
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Étape 3: Signature (affichée seulement après validation OTP) */}
        {otpStep === "signature" && (
          <div className="max-w-2xl mx-auto px-6 py-4 space-y-6">
            {/* Informations du signataire */}
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#F97316]/10 to-[#EA580C]/10 mb-3">
                  <svg className="w-8 h-8 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-1">Signature électronique</h3>
                <p className="text-sm text-[#64748B]">Signez le document ci-dessous</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Email du signataire
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={signerEmail}
                      disabled
                      className="w-full rounded-lg border border-[#E5E7EB] pl-10 pr-4 py-2.5 text-sm bg-[#F9FAFB] text-[#64748B]"
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Email validé
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-2">
                    Nom du signataire (optionnel)
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:ring-offset-0 bg-white transition-all"
                    placeholder="Votre nom"
                  />
                </div>
              </div>
            </div>

            {/* Zone de signature */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-3">
                Signature *
              </label>
              <div className="bg-gradient-to-br from-[#F9FAFB] to-white border-2 border-dashed border-[#E5E7EB] rounded-xl p-6 hover:border-[#F97316]/30 transition-colors">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full cursor-crosshair bg-white rounded-lg shadow-sm block"
                  style={{ touchAction: "none", minHeight: "200px", display: "block" }}
                />
                {!hasSignature && (
                  <p className="text-center text-xs text-[#64748B] mt-3">
                    Signez dans la zone ci-dessus
                  </p>
                )}
              </div>
            </div>

            {/* Consentement */}
            <div className="bg-gradient-to-br from-[#F9FAFB] to-white border border-[#E5E7EB] rounded-xl p-5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-[#E5E7EB] text-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 focus:ring-offset-0 cursor-pointer"
                  required
                />
                <label htmlFor="consent" className="text-sm text-[#64748B] leading-relaxed cursor-pointer">
                  {consentText}
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={clearSignature}
                disabled={!hasSignature}
                className="px-4 py-2.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Effacer
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB] rounded-lg transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasSignature || !consentGiven}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
                >
                  Signer le devis
                </button>
              </div>
            </div>
          </div>
        )}
    </Modal>
  );
}

