export const extractCloudinaryPublicId = (url: string) => {
    const parts = url.split('/');
    const filenameWithExtension = parts[parts.length - 1];
    return filenameWithExtension.split('.')[0];
};