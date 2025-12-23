import { GOOGLE_CONFIG } from '../constants';

// Declare types for global google object
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let tokenClient: any;
let accessToken: string | null = null;
let pickerApiLoaded = false;
let driveApiLoaded = false;

export const loadGoogleApi = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.gapi && window.google) {
      resolve();
      return;
    }
    
    // Wait for scripts to load if they haven't yet
    const checkInterval = setInterval(() => {
        if (window.gapi && window.google) {
            clearInterval(checkInterval);
            initializeGapiClient().then(resolve).catch(reject);
        }
    }, 500);
    
    // Timeout after 10s
    setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Google Scripts failed to load"));
    }, 10000);
  });
};

const initializeGapiClient = async () => {
  if (!GOOGLE_CONFIG.API_KEY || !GOOGLE_CONFIG.CLIENT_ID) {
    console.warn("Google Drive Config missing. Feature will be disabled.");
    return;
  }

  await new Promise<void>((resolve) => {
    window.gapi.load('picker', { callback: () => {
      pickerApiLoaded = true;
      resolve();
    }});
  });

  await new Promise<void>((resolve) => {
      window.gapi.load('client', { callback: () => {
          window.gapi.client.init({
              apiKey: GOOGLE_CONFIG.API_KEY,
              discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
          }).then(() => {
              driveApiLoaded = true;
              resolve();
          });
      }});
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    scope: GOOGLE_CONFIG.SCOPES,
    callback: async (response: any) => {
      if (response.error !== undefined) {
        throw (response);
      }
      accessToken = response.access_token;
    },
  });
};

export const handleGoogleLogin = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
        reject(new Error("Google API not initialized"));
        return;
    }

    // Override the callback to resolve the promise
    tokenClient.callback = (resp: any) => {
      if (resp.error) {
        reject(resp);
      } else {
        accessToken = resp.access_token;
        resolve();
      }
    };

    if (accessToken === null) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Skip display of account chooser and consent dialog for an existing session.
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

export const openDrivePicker = (): Promise<{ type: 'folder' | 'files', data: any }> => {
  return new Promise((resolve, reject) => {
    if (!pickerApiLoaded || !accessToken) {
        reject(new Error("Picker API not loaded or User not logged in"));
        return;
    }

    const view = new window.google.picker.View(window.google.picker.ViewId.FOLDERS);
    const imagesView = new window.google.picker.View(window.google.picker.ViewId.PHOTOS);

    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setDeveloperKey(GOOGLE_CONFIG.API_KEY)
      .setAppId(GOOGLE_CONFIG.APP_ID)
      .setOAuthToken(accessToken)
      .addView(view) // Folders
      .addView(imagesView) // Images
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            if (doc.mimeType === 'application/vnd.google-apps.folder') {
                resolve({ type: 'folder', data: doc });
            } else {
                // Return all picked docs
                resolve({ type: 'files', data: data.docs });
            }
        } else if (data.action === window.google.picker.Action.CANCEL) {
            reject(new Error("Selection cancelled"));
        }
      })
      .build();

    picker.setVisible(true);
  });
};

export const listImagesInFolder = async (folderId: string): Promise<string[]> => {
    if (!driveApiLoaded) throw new Error("Drive API not loaded");

    const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'files(id, name, thumbnailLink, webContentLink)',
        pageSize: 100
    });

    const files = response.result.files;
    if (files && files.length > 0) {
        return files.map((f: any) => {
             // Hack to get a larger thumbnail that works as a texture
             // thumbnailLink usually ends in something like "=s220". Changing to "=s1024" gets a high-res version.
             if (f.thumbnailLink) {
                 return f.thumbnailLink.replace(/=s\d+$/, '=s1024');
             }
             return f.webContentLink; 
        }).filter((url: string | undefined) => !!url);
    }
    return [];
};

export const extractFolderIdFromUrl = (url: string): string | null => {
  const match = url.match(/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};
