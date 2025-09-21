import React from 'react';
import { IconCurrency, IconPhoto, IconMusic, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { formatCurrency, formatTokens } from '../../lib/wallet';

const CostEstimation = ({ 
  model, 
  inputText = '', 
  attachedFiles = [], 
  showDetailed = false,
  className = '' 
}) => {
  if (!model || !model.pricing) {
    return null;
  }

  // Calculate text costs
  const inputTokens = Math.ceil(inputText.length / 4); // ~4 chars per token
  const estimatedOutputTokens = 150; // Reasonable default
  const textInputCost = (inputTokens / 1000) * (model.pricing.input || 0);
  const textOutputCost = (estimatedOutputTokens / 1000) * (model.pricing.output || 0);
  const textTotalCost = textInputCost + textOutputCost;
  // Token estimate (convert USD cost to tokens when possible)
  const estimatedTokenTotal = Math.ceil((textTotalCost) / 0.001); // TOKEN_VALUE_USD = 0.001

  // Calculate multimodal costs
  let imageCost = 0;
  let audioCost = 0;
  let imageCount = 0;
  let audioDuration = 0;

  attachedFiles.forEach(file => {
    if (file.type.startsWith('image/') && model.capabilities.image) {
      imageCost += model.pricing.image || 0;
      imageCount += 1;
    } else if (file.type.startsWith('audio/') && model.capabilities.audio) {
      // Rough estimation: 2MB per minute of audio
      const minutes = Math.max(1, Math.ceil(file.size / (1024 * 1024 * 2)));
      audioCost += minutes * (model.pricing.audio || 0);
      audioDuration += minutes;
    }
  });

  const totalEstimatedCost = textTotalCost + imageCost + audioCost;

  if (showDetailed) {
    return (
      <div className={`bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <IconCurrency className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
            Cost Estimation
          </h3>
        </div>
        
        <div className="space-y-2 text-sm">
          {/* Text costs */}
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400">
              Input ({inputTokens.toLocaleString()} tokens)
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {formatTokens( Math.ceil((textInputCost) / 0.001) )}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-600 dark:text-neutral-400">
              Output (~{estimatedOutputTokens.toLocaleString()} tokens)
            </span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">
              {formatTokens( Math.ceil((textOutputCost) / 0.001) )}
            </span>
          </div>

          {/* Image costs */}
          {imageCount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <IconPhoto className="w-4 h-4" />
                Images ({imageCount})
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatTokens( Math.ceil((imageCost) / 0.001) )}
              </span>
            </div>
          )}

          {/* Audio costs */}
          {audioDuration > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                <IconMusic className="w-4 h-4" />
                Audio (~{audioDuration}min)
              </span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatTokens( Math.ceil((audioCost) / 0.001) )}
              </span>
            </div>
          )}

          {/* Divider */}
          <hr className="border-neutral-200 dark:border-neutral-600" />
          
          {/* Total */}
          <div className="flex justify-between items-center font-semibold">
            <span className="text-neutral-900 dark:text-neutral-100">
              Total Estimated Cost
            </span>
            <span className="text-purple-600 dark:text-purple-400">
              {formatTokens( Math.ceil((totalEstimatedCost) / 0.001) )}
            </span>
          </div>
        </div>

        {/* Warning for unsupported files */}
        {attachedFiles.some(file => {
          const isImage = file.type.startsWith('image/');
          const isAudio = file.type.startsWith('audio/');
          return (isImage && !model.capabilities.image) || 
                 (isAudio && !model.capabilities.audio);
        }) && (
          <div className="mt-3 flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
            <IconAlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-700 dark:text-orange-300">
              Some attached files are not supported by this model and will be ignored.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact view
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <IconCurrency className="w-4 h-4 text-purple-600" />
      <span className="text-neutral-600 dark:text-neutral-400">
        Est. cost:
      </span>
      <span className="font-medium text-purple-600 dark:text-purple-400">
        {formatTokens( Math.ceil((totalEstimatedCost) / 0.001) )}
      </span>
      {totalEstimatedCost > 0.01 && (
        <IconInfoCircle className="w-4 h-4 text-neutral-400" title="This is a rough estimate. Actual costs may vary." />
      )}
    </div>
  );
};

export default CostEstimation;