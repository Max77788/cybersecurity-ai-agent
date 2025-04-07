export async function extractDocumentText(uploadedDocument) {
    try {
        // Convert the file to an ArrayBuffer
        const buffer = await uploadedDocument.arrayBuffer();

        console.log(`Buffer size: ${buffer.byteLength} bytes`);

        // Send the document as an octet-stream to the extraction endpoint
        const extractResponse = await fetch("https://pdf-reader-ochre.vercel.app/extract", {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream",
            },
            body: buffer,
        });

        const extractData = await extractResponse.json();
        const jobId = extractData.jobId;

        if (!jobId) {
            throw new Error("No jobId received from the extraction endpoint.");
        }

        // Poll the status endpoint every 3 seconds, up to 10 attempts
        let attempts = 0;
        let statusData = null;
        while (attempts < 10) {
            await new Promise((resolve) => setTimeout(resolve, 3000));

            const statusResponse = await fetch(`https://pdf-reader-ochre.vercel.app/status/${jobId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
            statusData = await statusResponse.json();

            if (statusData.status === "completed") {
                break;
            }
            attempts++;
        }

        if (statusData && statusData.status === "completed") {
            const extractedText = statusData.text;
            console.log("Extracted Text:", extractedText);
            return extractedText;
        } else {
            throw new Error("Extraction did not complete within the expected time.");
        }
    } catch (error) {
        console.error("Error during document extraction:", error);
        throw error;
    }
}