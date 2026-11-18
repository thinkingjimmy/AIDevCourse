'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// MDX accepts a function that returns an element. Next also types its loaders as class components.
function mdxDemo<Props extends object>(Component: ComponentType<Props>) {
  return function Demo(props: Props) { return <Component {...props} />; };
}

export const LLMGenerationDemo = mdxDemo(dynamic(() => import('../llm-generation/demo').then(module => module.LLMGenerationDemo)));
export const MenuComparisonDemo = mdxDemo(dynamic(() => import('../menu-comparison-demo').then(module => module.MenuComparisonDemo)));
export const NewtonSecondLawDemo = mdxDemo(dynamic(() => import('../physics/newton-second-law-demo').then(module => module.NewtonSecondLawDemo)));
export const AnimationDemo = mdxDemo(dynamic(() => import('../motion/demo').then(module => module.AnimationDemo)));
export const FrontendLayersDemo = mdxDemo(dynamic(() => import('../frontend/layers').then(module => module.FrontendLayersDemo)));
export const FrontendInspectorDemo = mdxDemo(dynamic(() => import('../frontend/inspector').then(module => module.FrontendInspectorDemo)));
export const FrontendInspectorPractice = mdxDemo(dynamic(() => import('../frontend/practice').then(module => module.FrontendInspectorPractice)));
export const HoverGardenDemo = mdxDemo(dynamic(() => import('../hover-garden').then(module => module.HoverGardenDemo)));
export const LLMSingleRoundTrainingDemo = mdxDemo(dynamic(() => import('../llm-training/single-round').then(module => module.LLMSingleRoundTrainingDemo)));
export const LLMMultiRoundTrainingDemo = mdxDemo(dynamic(() => import('../llm-training/multi-round').then(module => module.LLMMultiRoundTrainingDemo)));
export const LLMPretrainingOverview = mdxDemo(dynamic(() => import('../pretraining/overview').then(module => module.LLMPretrainingOverview)));
export const ChatMessageSequence = mdxDemo(dynamic(() => import('../chat-sequence/demo').then(module => module.ChatMessageSequence)));
