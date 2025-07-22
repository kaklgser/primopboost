import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js'; // Import createWorker from tesseract.js

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const parseFile = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.pdf')) {
    return await parsePDF(file);
  } else if (fileName.endsWith('.docx')) {
    return await parseDocx(file);
  } else if (fileName.endsWith('.txt')) {
    return await parseText(file);
  } else {
    throw new Error('Unsupported file format. Please use PDF, DOCX, or TXT files.');
  }
};

const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';

  // First, try to extract text directly from the PDF (for searchable PDFs)
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(' ') + ' ';
  }

  // If text is minimal or empty, it's likely an image-based PDF, so try OCR
  if (text.trim().length < 50) { // Arbitrary threshold: if less than 50 chars, assume it's image-based or poorly extracted
    console.log(" น้อยกว่า 50 ตัวอักษร");
    console.log('Detected potentially image-based PDF or sparse text. Attempting OCR...');
    let ocrText = '';
    const worker = await createWorker('eng'); // 'eng' for English language, can add more languages if needed

    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better OCR accuracy
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2D context for canvas');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;

        // Perform OCR on the canvas
        const { data: { text: pageOcrText } } = await worker.recognize(canvas);
        ocrText += pageOcrText + ' ';

        // Clean up canvas
        canvas.remove();
      }
      return ocrText.trim();
    } catch (ocrError) {
      console.error('OCR failed:', ocrError);
      // Fallback to the original extracted text if OCR fails
      return text.trim();
    } finally {
      await worker.terminate(); // Important: terminate the worker to free up resources
    }
  }

  return text.trim();
};

const parseDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const parseText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read text file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};