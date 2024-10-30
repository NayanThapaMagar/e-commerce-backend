import fs from 'fs';
import path from 'path';

export const deleteLocalImage = (filePath: string) => {
    const absolutePath = path.resolve(filePath); 
    try {
        fs.unlinkSync(absolutePath); 
    } catch (error) {
        console.error('Error deleting local image:', error);
        throw new Error('Failed to delete local image'); 
    }
};
