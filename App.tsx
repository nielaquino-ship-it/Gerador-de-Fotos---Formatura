import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateGraduationPhoto } from './services/geminiService';
import { UploadIcon, DownloadIcon, MailIcon, ShareIcon, SparklesIcon, XCircleIcon, ArrowPathIcon } from './components/Icons';

type AppState = 'initial' | 'loading' | 'result' | 'error';

const loadingMessages = [
  'Analisando a pose e iluminação da foto...',
  'Desenhando a beca com tecido virtual...',
  'Criando um fundo sofisticado de formatura...',
  'Ajustando a faixa azul para um caimento perfeito...',
  'Quase pronto! Dando os toques finais...',
];

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
  const [customMessage, setCustomMessage] = useState<string>('Formatura EJA 2025 - EMEB MARIA ADELAIDE ROSSI');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number | undefined;
    if (appState === 'loading') {
      setLoadingMessage(loadingMessages[0]);
      let messageIndex = 0;
      interval = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 3000); 
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [appState]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setAppState('initial'); 
        setGeneratedImage(null);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const addTextToImage = (base64Image: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Não foi possível obter o contexto do canvas.'));
            }

            ctx.drawImage(img, 0, 0);

            const fontSize = Math.max(24, Math.round(img.width / 28));
            ctx.font = `bold ${fontSize}px 'Helvetica', 'Arial', sans-serif`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            const lines = text.split('\n');
            const lineHeight = fontSize * 1.2;
            const bottomMargin = Math.max(20, Math.round(img.height * 0.05));

            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i];
                const y = canvas.height - bottomMargin - ((lines.length - 1 - i) * lineHeight);
                ctx.fillText(line, canvas.width / 2, y);
            }

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(new Error('Falha ao carregar a imagem gerada.'));
        };
        img.src = base64Image;
    });
  };

  const handleGenerateClick = async () => {
    if (!originalImage || !file) return;

    setAppState('loading');
    setError(null);

    try {
      const base64Data = originalImage.split(',')[1];
      const resultBase64 = await generateGraduationPhoto(base64Data, file.type);
      const imageWithGown = `data:image/png;base64,${resultBase64}`;

      const finalImage = customMessage.trim()
        ? await addTextToImage(imageWithGown, customMessage)
        : imageWithGown;

      setGeneratedImage(finalImage);
      setAppState('result');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido. Tente novamente.');
      setAppState('error');
    }
  };

  const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
  };

  const handleShare = async () => {
    if (!generatedImage || !file) return;
    try {
        const imageFile = await dataUrlToFile(generatedImage, `formatura-${file.name}`);
        if (navigator.share) {
            await navigator.share({
                title: 'Minha Foto de Formatura',
                text: customMessage,
                files: [imageFile],
            });
        } else {
            alert('A API de compartilhamento não é suportada neste navegador. Tente salvar a imagem e compartilhá-la manualmente.');
        }
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        alert('Falha ao compartilhar a imagem.');
    }
  };
  
  const handleReset = () => {
      setOriginalImage(null);
      setGeneratedImage(null);
      setFile(null);
      setError(null);
      setAppState('initial');
      setCustomMessage('Formatura EJA 2025 - EMEB MARIA ADELAIDE ROSSI');
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 h-64">
            <ArrowPathIcon className="h-12 w-12 text-blue-400 animate-spin mb-4" />
            <p className="text-lg font-semibold text-gray-300">Criando sua foto de formatura...</p>
            <p className="text-sm text-gray-400 mt-2 min-h-[2.5rem] flex items-center justify-center">{loadingMessage}</p>
            <p className="text-xs text-gray-500 mt-2">A mágica da IA leva um momentinho. Por favor, aguarde.</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 h-64 bg-red-900/20 border border-red-500/30 rounded-lg">
            <XCircleIcon className="h-12 w-12 text-red-400 mb-4" />
            <p className="text-lg font-semibold text-red-300">Ocorreu um Erro</p>
            <p className="text-sm text-gray-400 max-w-sm">{error}</p>
            <button onClick={handleGenerateClick} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Tentar Novamente
            </button>
          </div>
        );
      case 'result':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-400 mb-2">Original</h3>
              <img src={originalImage!} alt="Estudante Original" className="rounded-lg shadow-lg aspect-square object-cover w-full" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-400 mb-2">Formatura</h3>
              <img src={generatedImage!} alt="Estudante com Beca" className="rounded-lg shadow-lg aspect-square object-cover w-full" />
            </div>
          </div>
        );
      default:
        if (originalImage) {
            return (
                <div className="text-center">
                    <img src={originalImage} alt="Preview" className="max-h-64 rounded-lg shadow-lg mx-auto" />
                </div>
            )
        }
        return (
          <div className="flex flex-col items-center justify-center p-8 h-64 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}>
            <UploadIcon className="h-12 w-12 text-gray-500 mb-4" />
            <p className="text-lg font-semibold text-gray-300">Arraste uma foto ou clique para selecionar</p>
            <p className="text-sm text-gray-500">Use uma foto nítida e de frente para melhores resultados</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
            <div className="inline-block bg-yellow-400 p-2 rounded-full mb-4">
                <svg className="w-8 h-8 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v1.5M12 16.5v1.5M4.91 4.91l1.06 1.06M18.03 18.03l1.06 1.06M2 12.253h1.5M20.5 12.253H22M4.91 19.59l1.06-1.06M18.03 6.97l1.06-1.06"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253V2.5m0 19v-3.753m-6.34-1.003L3.5 19.5m17 0l-2.16-2.16M2 12.253H6.5m11 0H22m-18.5 0a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"></path></svg>
            </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-yellow-300">
            Gerador de Foto de Formatura
          </h1>
          <p className="mt-2 text-xl text-gray-400">Crie uma recordação especial</p>
        </header>

        <main className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          
          <div className="mb-6 min-h-[16rem] flex items-center justify-center">
            {renderContent()}
          </div>

          {originalImage && (appState === 'initial') && (
            <div className="mb-6">
                <label htmlFor="custom-message" className="block text-sm font-medium text-gray-300 mb-2">
                    Mensagem personalizada na foto:
                </label>
                <textarea
                    id="custom-message"
                    rows={2}
                    className="w-full bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                />
            </div>
          )}


          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
            {appState === 'initial' && originalImage && (
              <button
                onClick={handleGenerateClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out"
              >
                <SparklesIcon className="h-5 w-5" />
                Gerar Foto com Beca
              </button>
            )}
            {appState === 'result' && generatedImage && (
                <>
                    <a
                      href={generatedImage}
                      download={`formatura-${file?.name || 'imagem'}.png`}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      <DownloadIcon className="h-5 w-5" />
                      Salvar Foto
                    </a>
                    <a
                      href={`mailto:?subject=Minha%20Foto%20de%20Formatura&body=Veja%20minha%20foto%20de%20formatura!`}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      <MailIcon className="h-5 w-5" />
                      E-mail
                    </a>
                    <button
                      onClick={handleShare}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      <ShareIcon className="h-5 w-5" />
                      Compartilhar
                    </button>
                </>
            )}
             {(appState === 'result' || appState === 'error' || (appState === 'initial' && originalImage)) && (
                <button
                    onClick={handleReset}
                    className="w-full sm:w-auto text-gray-400 hover:text-white transition-colors py-2 px-4"
                >
                    Enviar outra foto
                </button>
             )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;