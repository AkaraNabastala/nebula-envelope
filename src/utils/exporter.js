import * as htmlToImage from 'html-to-image';

/**
  Standard Native Browser Document Exporter (No External Library Dependency Error for Text/PDF)
  Added html-to-image for PNG generation.
 */

// 1. Ekspor ke Word (.docx / HTML-based Doc Format)
export function exportToDocx(title, contentText, fileName = 'surat') {
  const header = "<html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' " +
    "xmlns:w='urn:schemas-microsoft-com:office:word' " +
    "xmlns='http://www.w3.org/TR/REC-html40'>" +
    "<head><meta charset='utf-8'><title>" + title + "</title>" +
    "<style>body{font-family:'Calibri',sans-serif;font-size:12pt;line-height:1.5;margin:2cm;}</style></head><body>";
  
  const formattedBody = contentText.replace(/\n/g, '<br/>');
  const footer = "</body></html>";
  const sourceHTML = header + formattedBody + footer;

  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 2. Ekspor ke PDF / Print Dialog
export function exportToPdf(title, contentText, fileName = 'surat') {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 3cm 2cm; font-size: 12pt; line-height: 1.6; color: #000; }
            .content { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="content">${contentText}</div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

// 3. Unduh Teks Biasa (.txt)
export function exportToText(contentText, fileName = 'surat', extension = 'txt') {
  const blob = new Blob([contentText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 4. Ekspor ke Gambar (PNG)
export async function exportToImage(elementId, fileName = 'surat') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Elemen tidak ditemukan untuk dirender sebagai gambar.");
    return;
  }
  
  try {
    const dataUrl = await htmlToImage.toPng(element, { quality: 0.95, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    console.error("Gagal merender gambar:", error);
    alert("Gagal menyimpan sebagai gambar.");
  }
}
