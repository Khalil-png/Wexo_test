
import React, { useState, useEffect } from 'react';
import { TriangleAlert, CheckCircle, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { testPocketBaseConnection, pb } from '../services/pocketbaseService';

const PocketBaseStatus: React.FC = () => {
    const [status, setStatus] = useState<'testing' | 'connected' | 'failed'>('testing');
    const [url, setUrl] = useState('');
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    const checkConnection = async () => {
        setStatus('testing');
        setErrorDetails(null);
        try {
            // @ts-ignore
            setUrl(pb.baseUrl);
            const isConnected = await testPocketBaseConnection();
            if (isConnected) {
                setStatus('connected');
            } else {
                setStatus('failed');
                setErrorDetails("Health check returned non-200 or failed to reach origin.");
            }
        } catch (err: any) {
            setStatus('failed');
            setErrorDetails(err.message || String(err));
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    if (status === 'connected') return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-in slide-in-from-bottom-4 duration-500">
            <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
                status === 'testing' ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                        status === 'testing' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-400'
                    }`}>
                        {status === 'testing' ? <RefreshCw className="animate-spin" size={24} /> : <TriangleAlert size={24} />}
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-white mb-1">
                            {status === 'testing' ? 'Vérification NAS...' : 'Connexion NAS Échouée'}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium mb-3">
                            L'application ne parvient pas à contacter votre PocketBase sur : <br/>
                            <code className="text-white bg-black/30 px-1 rounded">{url}</code>
                        </p>
                        
                        {errorDetails && (
                            <div className="bg-black/40 rounded-lg p-2 mb-3">
                                <p className="text-[9px] font-mono text-red-400 break-all">{errorDetails}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                             <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold rounded-xl transition-all border border-white/10"
                            >
                                <ExternalLink size={12} />
                                Ouvrir l'admin pour tester
                            </a>
                            <button 
                                onClick={checkConnection}
                                className="flex items-center justify-center gap-2 py-2 px-4 bg-white text-black text-[10px] font-bold rounded-xl transition-all hover:bg-slate-200"
                            >
                                <RefreshCw size={12} />
                                Réessayer la connexion
                            </button>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-[9px] text-slate-500 italic">
                                Note: Si vous utilisez HTTPS, assurez-vous que votre certificat est valide. 
                                Si vous utilisez une IP locale, elle ne sera pas accessible depuis Internet.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PocketBaseStatus;
