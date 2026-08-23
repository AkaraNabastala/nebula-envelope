import mammoth from 'mammoth';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import ImageModule from 'docxtemplater-image-module-free';

/**
  Engine Pemindai Variabel & Generator Template Surat
  Mendukung format tag standar: {{variabel}}, <<variabel>>, @variabel, ${variabel}
 */

// 1. Pindai dan ekstrak semua variabel dari teks template
export function parseTemplateVariables(text) {
  if (!text) return [];
  
  // Regex untuk mencocokkan: {{var}}, <<var>>, @var, ${var}
  const regexes = [
    /\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g,
    /\<\<\s*([a-zA-Z0-9_\-]+)\s*\>\>/g,
    /\@([a-zA-Z0-9_\-]+)\b/g,
    /\$\{\s*([a-zA-Z0-9_\-]+)\s*\}/g
  ];
  
  const matches = new Set();
  
  regexes.forEach(regex => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        matches.add(match[1].trim());
      }
    }
  });

  return Array.from(matches);
}

// 2. Ganti seluruh tag variabel dalam template dengan nilai dari data form
export function populateTemplate(text, formData = {}) {
  if (!text) return '';

  let populated = text;

  // Replace {{var}}
  populated = populated.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (fullMatch, varName) => {
    const trimmed = varName.trim();
    return formData[trimmed] !== undefined && formData[trimmed] !== null ? formData[trimmed] : '';
  });

  // Replace <<var>>
  populated = populated.replace(/\<\<\s*([a-zA-Z0-9_\-]+)\s*\>\>/g, (fullMatch, varName) => {
    const trimmed = varName.trim();
    return formData[trimmed] !== undefined && formData[trimmed] !== null ? formData[trimmed] : '';
  });

  // Replace @var
  populated = populated.replace(/\@([a-zA-Z0-9_\-]+)\b/g, (fullMatch, varName) => {
    const trimmed = varName.trim();
    return formData[trimmed] !== undefined && formData[trimmed] !== null ? formData[trimmed] : '';
  });

  // Replace ${var}
  populated = populated.replace(/\$\{\s*([a-zA-Z0-9_\-]+)\s*\}/g, (fullMatch, varName) => {
    const trimmed = varName.trim();
    return formData[trimmed] !== undefined && formData[trimmed] !== null ? formData[trimmed] : '';
  });

  return populated;
}

// 3. Format variabel nama kunci ke bentuk Label yang ramah pengguna
export function formatVariableLabel(varName) {
  return varName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// 4. Ekstrak teks mentah dari file Word (.docx)
export async function extractTextFromDocx(fileBlob) {
  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const zip = new PizZip(arrayBuffer);

    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value; // Teks murni dari .docx
  } catch (error) {
    console.error("Gagal membaca file .docx:", error);
    throw error;
  }
}

// 5. Generate Native Word Document (.docx) preserving format
export async function generateNativeDocx(fileBase64, formData, outputFileName) {
  try {
    const cleanBase64 = fileBase64.replace(/^data:.*,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const zip = new PizZip(bytes.buffer);

    const imageOptions = {
      centered: false,
      getImage(tagValue, tagName) {
        if(tagValue && tagValue.startsWith("data:image")) {
          const base64Data = tagValue.replace(/^data:image\/\w+;base64,/, "");
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
        return tagValue;
      },
      getSize(img, tagValue, tagName) {
        return [100, 100];
      }
    };

    let doc;
    try {
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        modules: [new ImageModule(imageOptions)],
        nullGetter: function(part) {
          return "";
        }
      });
    } catch(err) {
      console.error("Docxtemplater error in templateEngine:", err);
      let errorMessage = "Gagal membuat surat: Terdapat kesalahan penulisan kurung kurawal pada template Word Anda.";
      if (err.properties && err.properties.errors) {
        const msgs = err.properties.errors.map(e => e.properties?.explanation || e.message).join('\n- ');
        errorMessage += "\n\nMohon perbaiki typo berikut di MS Word:\n- " + msgs;
      }
      throw new Error(errorMessage);
    }

    doc.render(formData);

    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    
    // Hanya return base64, biarkan backend yang menyimpan secara fisik
    // Return base64 of the generated file to store in database if needed
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // Full Data URL
      reader.readAsDataURL(out);
    });
  } catch (error) {
    console.error("Gagal generate native docx:", error);
    throw error;
  }
}
