// Configuration and types previously handled in chart.ts

import type { BubbleChartData } from '../types/data.js';
import type { BubbleChartOptions } from '../types/config.js';
import type { KeyFunction } from './store.js';
import type { AnimationConfig } from '../types/config.js';

export interface BubbleChartOptionsExtended<T extends BubbleChartData = BubbleChartData> 
    extends Partial<BubbleChartOptions> {
  key?: KeyFunction<T>;
  animations?: AnimationConfig;
}

