const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function buildOptimizedCloudinaryUrl(cloudName, publicId, options = {}) {
  if (!cloudName || !publicId) return null;

  const width = Number(options.width) > 0 ? Number(options.width) : 1000;
  const transformations = `c_scale,w_${width},q_auto,f_auto`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

export async function uploadImageToCloudinary(file, options = {}) {
  if (!file) return { success: false, error: 'No se envió archivo' };
  if (!VALID_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Tipo de archivo no permitido (JPG, PNG, WEBP)' };
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    return { success: false, error: 'Cloudinary no configurado (VITE_CLOUDINARY_CLOUD_NAME)' };
  }

  if (!uploadPreset) {
    return { success: false, error: 'Upload preset no configurado (VITE_CLOUDINARY_UPLOAD_PRESET)' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', options.folder || import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || 'nosee/publications');

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: body?.error?.message || `Error de Cloudinary (${response.status})`,
      };
    }

    return {
      success: true,
      url: body.secure_url,
      publicId: body.public_id,
      optimizedUrl: buildOptimizedCloudinaryUrl(cloudName, body.public_id, {
        width: options.width,
      }),
    };
  } catch (error) {
    return { success: false, error: error.message || 'Error subiendo imagen a Cloudinary' };
  }
}
