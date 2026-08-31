'use client';

import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

export type ResumeItem = {
  id: string;
  fileName: string;
  rawText: string;
};

export function usePdfParser() {
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState<string>('');

  useEffect(() => {
    // Set up the worker source using our public worker file
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
  }, []);

  const parsePdf = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(`Parsing page ${i} of ${pdf.numPages} for ${file.name}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract string values from text items
        const pageText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter((str) => str.trim().length > 0)
          .join(' ');
          
        fullText += pageText + '\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error(`Error parsing PDF ${file.name}:`, error);
      throw new Error(`Failed to parse PDF: ${file.name}`);
    }
  };

  const parseMultiplePdfs = async (files: File[]): Promise<ResumeItem[]> => {
    setIsParsing(true);
    setProgress('Starting PDF ingestion...');
    const results: ResumeItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Processing file ${i + 1} of ${files.length}: ${file.name}...`);
        
        const rawText = await parsePdf(file);
        
        results.push({
          id: Math.random().toString(36).substring(2, 9),
          fileName: file.name,
          rawText: rawText || 'Empty or un-extractable resume text.'
        });
      }
      
      setProgress('PDF ingestion completed successfully.');
      return results;
    } catch (error) {
      console.error('Error during bulk PDF parsing:', error);
      setProgress('An error occurred during PDF parsing.');
      throw error;
    } finally {
      setIsParsing(false);
    }
  };

  return {
    parsePdf,
    parseMultiplePdfs,
    isParsing,
    progress,
    setProgress,
  };
}
