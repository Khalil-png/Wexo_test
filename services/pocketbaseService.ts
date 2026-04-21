import PocketBase from 'pocketbase';

const getPbUrl = () => {
  const envUrl = import.meta.env.VITE_POCKETBASE_URL;
  let url = (envUrl && envUrl.trim() !== '') ? envUrl : 'https://carnote.synology.me:9443';
  if (url && !url.startsWith('http')) {
    url = `https://${url}`;
  }
  return url;
};

const pbUrl = getPbUrl();
console.log('PocketBase URL:', pbUrl);
export const pb = new PocketBase(pbUrl);

// Désactiver l'auto-cancellation pour éviter les erreurs "request aborted" lors de re-renders React
pb.autoCancellation(false);

/**
 * Tests the connection to the PocketBase instance.
 */
export const testPocketBaseConnection = async (): Promise<boolean> => {
  try {
    const health = await pb.health.check();
    console.log('PocketBase health check success:', health);
    return health.code === 200;
  } catch (error: any) {
    console.error('PocketBase connection failed:', {
      message: error.message,
      url: pbUrl,
      error: error
    });
    return false;
  }
};

/**
 * Uploads a file to the 'media' collection on PocketBase.
 * @param file The file or blob to upload.
 * @param fileName Optional filename if uploading a blob.
 * @returns The URL of the uploaded file.
 */
export const uploadToPocketBase = async (file: File | Blob, fileName?: string): Promise<string> => {
  try {
    const formData = new FormData();
    
    // Convert Blob to File if necessary
    let fileToUpload: File;
    if (file instanceof File) {
      fileToUpload = file;
    } else {
      fileToUpload = new File([file], fileName || `upload_${Date.now()}.jpg`, { type: file.type || 'application/octet-stream' });
    }

    formData.append('file', fileToUpload);
    // Add some metadata
    formData.append('name', fileToUpload.name);

    const record = await pb.collection('media').create(formData);
    
    // Construct the file URL using built-in method
    // @ts-ignore
    const fileUrl = pb.files.getUrl(record, record.file);
    
    return fileUrl;
  } catch (error) {
    console.error('Error uploading to PocketBase:', error);
    throw error;
  }
};

/**
 * Creates a record in any collection.
 */
export const createPBRecord = async (collectionName: string, data: any) => {
  try {
    return await pb.collection(collectionName).create(data);
  } catch (error) {
    console.error(`Error creating record in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Gets the full URL for a file stored in PocketBase.
 */
export const getPocketBaseFileUrl = (collectionId: string, recordId: string, fileName: string): string => {
  return `${pbUrl}/api/files/${collectionId}/${recordId}/${fileName}`;
};
