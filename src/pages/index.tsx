import { useState, useRef, ChangeEvent } from 'react';
import { ImageIcon, FileIcon } from 'lucide-react'; // Import FileIcon for indicating selected files

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState<string>('');
  const [encryptedFile, setEncryptedFile] = useState<Blob | null>(null);
  const [encryptedFileUrl, setEncryptedFileUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt'); // Mode state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  console.log(encryptedFile);

  // Convert ArrayBuffer to Hexadecimal string
  const arrayBufferToHex = (buffer: ArrayBuffer): string => {
    return Array.prototype.map
      .call(new Uint8Array(buffer), (x: number) => ('00' + x.toString(16)).slice(-2))
      .join('');
  };

  // Convert Hexadecimal string to ArrayBuffer
  const hexToArrayBuffer = (hex: string): ArrayBuffer => {
    const typedArray = new Uint8Array(
      hex.match(/[\da-f]{2}/gi)?.map((h) => parseInt(h, 16)) || []
    );
    return typedArray.buffer;
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    setFile(selectedFile);
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    setFile(droppedFile);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  // Encrypt the selected file
  const handleEncrypt = async (): Promise<void> => {
    if (!file) return alert('Please select a file.');

    const rawKey =
      key.length === 64
        ? await window.crypto.subtle.importKey('raw', hexToArrayBuffer(key), 'AES-GCM', true, ['encrypt', 'decrypt'])
        : await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

    // Save the key as hex string if it was generated
    if (key.length !== 64) {
      const exportedKey = await window.crypto.subtle.exportKey('raw', rawKey);
      const hexKey = arrayBufferToHex(exportedKey);
      setKey(hexKey); // Show the key to the user for later decryption
    }

    const fileBuffer = await file.arrayBuffer();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector

    // Encrypt file content
    const encryptedContent = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, rawKey, fileBuffer);

    const encryptedBlob = new Blob([iv, encryptedContent], { type: 'application/octet-stream' });
    setEncryptedFile(encryptedBlob);

    // Generate URL for downloading the encrypted file
    const encryptedUrl = URL.createObjectURL(encryptedBlob);
    setEncryptedFileUrl(encryptedUrl);
  };

  // Decrypt the encrypted file
  const handleDecrypt = async (): Promise<void> => {
    if (!file || !key || key.length !== 64) return alert('No file or invalid key provided.');

    const fileBuffer = await file.arrayBuffer();
    const iv = fileBuffer.slice(0, 12); // Extract IV (first 12 bytes)
    const encryptedData = fileBuffer.slice(12); // The rest is the encrypted content

    const rawKey = await window.crypto.subtle.importKey('raw', hexToArrayBuffer(key), { name: 'AES-GCM' }, false, ['decrypt']);

    try {
      const decryptedContent = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, rawKey, encryptedData);

      const decryptedBlob = new Blob([decryptedContent], { type: file?.type });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(decryptedBlob);
      downloadLink.download = `decrypted_${file?.name}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    } catch (error) {
      console.error('Decryption failed:', error);
      alert('Decryption failed.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-5">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Encrypt and Decrypt File</h1>

      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`w-1/2 py-2 px-4 font-bold rounded-lg ${mode === 'encrypt' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
          >
            Encrypt
          </button>
          <button
            onClick={() => setMode('decrypt')}
            className={`w-1/2 py-2 px-4 font-bold rounded-lg ${mode === 'decrypt' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}
          >
            Decrypt
          </button>
        </div>

        <h2 className="text-2xl font-semibold text-gray-700 mb-4">{mode === 'encrypt' ? 'Encryption' : 'Decryption'}</h2>

        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragging ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          {file ? (
            <div className="flex items-center justify-center mt-2">
              <FileIcon className="h-8 w-8 text-gray-600" />
              <span className="ml-2 text-gray-700">{file.name}</span> {/* Display file name */}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              Drop your file here, or{' '}
              <button
                onClick={handleBrowse}
                className="text-blue-500 hover:text-blue-600 focus:outline-none focus:underline"
              >
                browse
              </button>
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Supports PNG, JPG, GIF, MP3
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".png,.jpg,.gif,.mp3"
          />
        </div>

        {mode === 'encrypt' && (
          <>
            <button
              onClick={handleEncrypt}
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition mt-4"
            >
              Encrypt File
            </button>

            {key && (
              <p className="mt-4 text-sm text-gray-600">
                Save this key for decryption later: <strong>{key}</strong>
              </p>
            )}

            {encryptedFileUrl && (
              <a
                href={encryptedFileUrl}
                download={`encrypted_${file?.name}`}
                className="block w-full bg-blue-500 text-white text-center font-bold py-2 px-4 rounded-lg hover:bg-blue-600 transition mt-4"
              >
                Download Encrypted File
              </a>
            )}
          </>
        )}

        {mode === 'decrypt' && (
          <>
            <input
              type="text"
              placeholder="Enter Key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <button
              onClick={handleDecrypt}
              className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition"
            >
              Decrypt File
            </button>
          </>
        )}
      </div>
    </div>
  );
}
