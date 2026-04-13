/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export interface NarrativeSection {
  title: string;
  content: string;
  type: 'text' | 'diagram' | 'quote' | 'metric';
  visualData?: any;
}

export interface NarrativeSite {
  id: string;
  title: string;
  authors: string[];
  sections: NarrativeSection[];
  createdAt: string;
  createdBy: string;
  paperAbstract?: string;
}

export interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}
