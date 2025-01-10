import unzipper from 'unzipper';
import dotenv from 'dotenv';
dotenv.config();

 export async function extractFiles(filename) {
    const downloadedpath = `${process.env.DOWNLOAD_PATH}/`
    const extractpath = `${process.env.EXTRACT_PATH}/`
    // Open the downloaded file
    const directory = await unzipper.Open.file(`${downloadedpath}${filename}`);

    if (directory.files[0].type === 'Directory') {
        const path = directory.files[0].path;
        await directory.extract({ path: `${extractpath}` });
        console.log(path);
        return `${path}`;
    }
    else {
        const dirname = filename.split('.')[0];
        await directory.extract({ path: `${extractpath}${dirname}` });
        return `${dirname}`;
    }
}
