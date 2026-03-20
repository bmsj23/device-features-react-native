import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const ENTRY_DIRECTORY_NAME = 'travel-diary-entries';

function getEntryDirectory(): Directory {
  const entryDirectory = new Directory(Paths.document, ENTRY_DIRECTORY_NAME);

  if (!entryDirectory.exists) {
    entryDirectory.create({
      idempotent: true,
      intermediates: true,
    });
  }

  return entryDirectory;
}

function getFileExtension(uri: string): string {
  const extensionMatch = uri.match(/\.[A-Za-z0-9]+(?=$|[?#])/);

  return extensionMatch?.[0] ?? '.jpg';
}

export async function persistCapturedPhotoAsync(tempUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return tempUri;
  }

  if (tempUri.trim().length === 0) {
    throw new Error('No captured photo was found.');
  }

  const sourceFile = new File(tempUri);

  if (!sourceFile.exists) {
    throw new Error('The captured photo is no longer available.');
  }

  const entryDirectory = getEntryDirectory();
  const destinationFile = new File(
    entryDirectory,
    `entry-${Date.now()}${getFileExtension(tempUri)}`
  );

  sourceFile.copy(destinationFile);

  return destinationFile.uri;
}

export async function deleteSavedPhotoAsync(
  uri: string | null | undefined
): Promise<void> {
  if (!uri || !uri.startsWith('file://')) {
    return;
  }

  const photoFile = new File(uri);

  if (!photoFile.exists) {
    return;
  }

  photoFile.delete();
}
