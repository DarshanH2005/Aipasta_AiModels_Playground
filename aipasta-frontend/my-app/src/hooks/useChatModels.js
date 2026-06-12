import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchModels } from '../lib/api-client';

export const useChatModels = (user, isClient, authLoading, toast, setError) => {
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [hasLoadedModels, setHasLoadedModels] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);
  const modelsLoadAttempted = useRef(false);

  const loadModels = useCallback(async () => {
    if (modelsLoading) return;

    try {
      setModelsLoading(true);
      const response = await fetchModels();
      const loadedModels = response.models || [];
      
      setModels(loadedModels);

      if (selectedModels.length === 0 && loadedModels.length > 0) {
        const preferredFreeModels = [
          "meta-llama/llama-3.1-405b-instruct:free",
          "deepseek/deepseek-r1:free",
          "deepseek/deepseek-chat-v3.1:free",
          "cognitivecomputations/dolphin3.0-mistral-24b:free",
          "deepseek/deepseek-r1-distill-llama-70b:free",
          "arliai/qwq-32b-arliai-rpr-v1:free",
        ];

        let defaultModel = null;

        for (const preferredId of preferredFreeModels) {
          defaultModel = loadedModels.find((model) => model.id === preferredId);
          if (defaultModel) break;
        }

        if (!defaultModel) {
          defaultModel = loadedModels.find(
            (model) =>
              model.pricing &&
              (model.pricing.input === 0 || model.pricing.input === null) &&
              model.id && typeof model.id === "string" && model.id.length >= 3
          );
        }

        if (!defaultModel) {
          defaultModel = loadedModels.find(
            (model) => model.id && typeof model.id === "string" && model.id.length >= 3
          );
        }

        if (defaultModel) {
          setSelectedModels([defaultModel]);
        }
      }

      setHasLoadedModels(true);
    } catch (error) {
      console.error("? Error loading models from backend:", error);
      toast.error("Failed to load AI models: " + error.message);
      if (setError) setError("Failed to load AI models: " + error.message);
    } finally {
      setModelsLoading(false);
    }
  }, [modelsLoading, selectedModels.length, toast, setError]);

  const checkAuthAndLoadModels = useCallback(async () => {
    try {
      await loadModels();
    } catch (error) {
      toast.error("Failed to initialize: " + error.message);
      if (setError) setError("Failed to initialize: " + error.message);
    }
  }, [loadModels, toast, setError]);

  useEffect(() => {
    if (isClient && !authLoading && user && !modelsLoadAttempted.current) {
      modelsLoadAttempted.current = true;
      checkAuthAndLoadModels();
    } else if (isClient && !authLoading && !user) {
      setModels([]);
      if (setError) setError(null);
      setHasLoadedModels(false);
      modelsLoadAttempted.current = false;
    }
  }, [user, isClient, authLoading, checkAuthAndLoadModels, setError]);

  return {
    models,
    setModels,
    modelsLoading,
    hasLoadedModels,
    selectedModels,
    setSelectedModels,
    loadModels
  };
};
