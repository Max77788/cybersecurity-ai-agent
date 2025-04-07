import PDFParser from 'pdf2json';

export async function extractDocumentText(uploadedDocument) {
    return new Promise((resolve, reject) => {
        try {
            // Ensure uploadedDocument is a Node.js Buffer.
            const buffer =
                uploadedDocument instanceof Buffer
                    ? uploadedDocument
                    : Buffer.from(uploadedDocument);

            console.log(`Buffer size: ${buffer.byteLength} bytes`);

            const pdfParser = new PDFParser();

            pdfParser.on("pdfParser_dataError", (errData) => {
                console.error("Error during PDF parsing:", errData.parserError);
                reject(errData.parserError);
            });

            pdfParser.on("pdfParser_dataReady", (pdfData) => {
                let extractedText = "";
                console.log("PDF data ready:", JSON.stringify(pdfData));

                // Check for both possible page properties.
                const pages =
                    (pdfData.formImage && Array.isArray(pdfData.formImage.Pages)
                        ? pdfData.formImage.Pages
                        : pdfData.Pages) || [];

                pages.forEach((page) => {
                    if (page.Texts && Array.isArray(page.Texts)) {
                        page.Texts.forEach((textItem) => {
                            if (textItem.R && Array.isArray(textItem.R)) {
                                textItem.R.forEach((item) => {
                                    // Decode the URL-encoded text; use empty string if missing.
                                    extractedText += decodeURIComponent(item.T || "") + " ";
                                });
                            }
                        });
                    }
                    extractedText += "\n";
                });

                // Remove extra spaces between letters (i.e. join letters that are separated by spaces).
                extractedText = extractedText.replace(/(?<=\w)\s+(?=\w)/g, '');

                const finalText = extractedText.trim();
                console.log("Extracted text:", finalText);
                resolve(finalText);
            });

            // Parse the buffer.
            pdfParser.parseBuffer(buffer);
        } catch (error) {
            console.error("Error during PDF parsing:", error);
            reject(error);
        }
    });
}