const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CLOUDINARY_MODERATION_PROVIDER = String(
  import.meta.env.VITE_CLOUDINARY_MODERATION_PROVIDER || "aws_rek",
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .join("|");

function buildOptimizedCloudinaryUrl(cloudName, publicId, options = {}) {
  if (!cloudName || !publicId) return null;

  const width = Number(options.width) > 0 ? Number(options.width) : 1000;
  const transformations = `c_limit,w_${width},q_auto,f_auto`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Inserta parámetros de optimización en una URL de Cloudinary ya existente.
 * Funciona tanto para URLs guardadas sin transformaciones como para public_ids.
 * Si la URL ya tiene transformaciones, la devuelve sin cambios.
 *
 * @param {string} url  - URL de Cloudinary o public_id
 * @param {object} opts - { width: number }
 */
export function optimizeCloudinaryUrl(url, { width = 800 } = {}) {
  if (!url) return url;
  if (!url.includes('res.cloudinary.com')) return url;
  if (/\/upload\/[^/]*(q_|f_|w_|c_)/.test(url)) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

/**
 * Comprime una imagen en el cliente usando Canvas antes de subirla.
 * Reduce imágenes grandes a máx 1600px de ancho a JPEG 85% de calidad.
 * Devuelve el archivo original si la compresión falla.
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function compressImage(file) {
  const MAX_WIDTH = 1600;
  const QUALITY = 0.85;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width <= MAX_WIDTH) {
        resolve(file);
        return;
      }

      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
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
  if (String(import.meta.env.VITE_CLOUDINARY_ENABLE_MODERATION || "true").toLowerCase() !== "false") {
    formData.append("moderation", CLOUDINARY_MODERATION_PROVIDER || "aws_rek");
  }

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
      moderation: body.moderation || null,
      optimizedUrl: buildOptimizedCloudinaryUrl(cloudName, body.public_id, {
        width: options.width,
      }),
    };
  } catch (error) {
    return { success: false, error: error.message || 'Error subiendo imagen a Cloudinary' };
  }
}
