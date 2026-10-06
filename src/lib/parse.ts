import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export const parsePdfText = async (pdfBuffer: Buffer): Promise<string> => {
  const parser = new PDFParse({
    data: pdfBuffer,
  });

  const result = await parser.getText();

  await parser.destroy();

  return result.text.trim();
};

export const parseDocxText = async (docxBuffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({
    buffer: docxBuffer,
  });

  return result.value.trim();
};