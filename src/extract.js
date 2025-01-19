import unzipper from 'unzipper';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

export async function extractFiles(filename,userId) {
    console.log('im from extracting scripts...');
    console.log(filename)
    const downloadedpath = `${process.env.DOWNLOAD_PATH}/${userId}/`;
    const extractpath = `${process.env.EXTRACT_PATH}/${userId}/`;
    
    // Open the downloaded file
    const directory = await unzipper.Open.file(`${downloadedpath}${filename}`);

    // Use the full filename (minus the file extension) as the directory name
    const dirname = filename
        .split('.')
        .slice(0, -1)
        .join('.');
    
    // Full path for extraction
    const fullExtractPath = `${extractpath}${dirname}`;

    // Extract files
    await directory.extract({ path: fullExtractPath });

    // Check if there's a nested directory and flatten if needed
    const extractedContents = fs.readdirSync(fullExtractPath);
    
    if (extractedContents.length === 1 && 
        fs.statSync(path.join(fullExtractPath, extractedContents[0])).isDirectory()) {
        // If there's only one directory, move its contents up
        const nestedDir = path.join(fullExtractPath, extractedContents[0]);
        const nestedContents = fs.readdirSync(nestedDir);
        
        nestedContents.forEach(item => {
            fs.renameSync(
                path.join(nestedDir, item), 
                path.join(fullExtractPath, item)
            );
        });
        
        // Remove the now-empty nested directory
        fs.rmdirSync(nestedDir);
    }

    console.log(`Extracted to: ${fullExtractPath}`);
    return dirname;
}