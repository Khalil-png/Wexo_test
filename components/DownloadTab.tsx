
import React, { useState, useEffect } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const DownloadTab: React.FC = () => {
  const [appConfig, setAppConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<'windows' | 'android' | 'apple' | 'other'>('other');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Win/i.test(ua)) {
      setDevice('windows');
    } else if (/Android/i.test(ua)) {
      setDevice('android');
    } else if (/Mac|iPhone|iPad|iPod/i.test(ua)) {
      setDevice('apple');
    } else {
      setDevice('other');
    }

    const unsub = onSnapshot(doc(db, 'settings', 'app_config'), (snap) => {
      if (snap.exists()) {
        setAppConfig(snap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-sky-500" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-16">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 border border-white/10">
          <Download size={32} />
        </div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Télécharger Wexo</h1>
        <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">
          Profitez de l'expérience Wexo sur tous vos appareils. Une application plus rapide, plus fluide et toujours à portée de main.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
        {device === 'windows' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 hover:bg-[#222] transition-all duration-300 animate-in zoom-in duration-500">
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://files.catbox.moe/glp2zo.png" 
                  alt="Windows" 
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="px-4 py-1.5 bg-sky-500/10 text-sky-500 text-[10px] font-black rounded-2xl border border-sky-500/20">
                Compatible
              </span>
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Windows</h3>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
              Application native pour Windows 10 et 11. Supporte les notifications système et le mode sombre automatique.
            </p>
            <a 
              href={appConfig?.exe_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-3 w-full py-4 ${appConfig?.exe_url ? 'bg-white text-black hover:bg-slate-200' : 'bg-white/5 text-white/20 cursor-not-allowed'} text-xs font-black rounded-2xl transition-all duration-300`}
            >
              <Download size={18} />
              {appConfig?.exe_url ? 'Télécharger .EXE' : 'Indisponible'}
            </a>
          </div>
        )}

        {device === 'android' && (
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 hover:bg-[#222] transition-all duration-300 animate-in zoom-in duration-500">
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
                <img 
                  src="https://files.catbox.moe/0fzoqk.png" 
                  alt="Android" 
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-2xl border border-emerald-500/20">
                Compatible
              </span>
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Android</h3>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
              Installez l'application Wexo sur votre smartphone Android via le fichier APK. Mises à jour automatiques via le cloud.
            </p>
            <a 
              href="/downloads/Wexo.apk"
              download="Wexo.apk"
              className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-black rounded-2xl transition-all duration-300"
            >
              <Download size={18} />
              Télécharger .APK
            </a>
          </div>
        )}

        {(device === 'apple' || device === 'other') && (
          <div className="bg-[#1a1a1a] border border-red-500/20 rounded-2xl p-10 text-center animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
              <X size={40} />
            </div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Non Compatible</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Désolé, Wexo n'est pas encore disponible pour {device === 'apple' ? 'les appareils Apple (iOS/macOS)' : 'votre appareil'}. 
              Utilisez la version web pour continuer à profiter de Wexo.
            </p>
          </div>
        )}
      </div>

      <div className="mt-12 bg-[#1a1a1a] border border-white/5 rounded-2xl p-10 text-center">
        <h4 className="text-xl font-black text-white mb-4 tracking-tight">Mises à jour intelligentes</h4>
        <p className="text-slate-500 text-sm font-medium mb-8 max-w-xl mx-auto">
          Pas besoin de retélécharger l'installateur à chaque fois. Quand une mise à jour est disponible, l'application se synchronise automatiquement avec <span className="text-white">wexo.netlify.app</span> pour vous offrir les dernières nouveautés instantanément.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div>
            <div className="text-sky-500 font-black mb-1">01. Performance</div>
            <p className="text-slate-500 text-[11px] font-bold leading-relaxed">Chargement instantané et fluidité maximale grâce à l'accélération matérielle.</p>
          </div>
          <div>
            <div className="text-sky-500 font-black mb-1">02. Notifications</div>
            <p className="text-slate-500 text-[11px] font-bold leading-relaxed">Recevez vos messages et alertes en temps réel même quand l'app est fermée.</p>
          </div>
          <div>
            <div className="text-sky-500 font-black mb-1">03. Intégration</div>
            <p className="text-slate-500 text-[11px] font-bold leading-relaxed">Raccourcis clavier et intégration parfaite avec votre système d'exploitation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadTab;
