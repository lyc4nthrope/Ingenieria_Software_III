/**
 * publications.moderation.js
 *
 * Lógica de moderación automática para publicaciones de NØSEE.
 * Extrae los dos bloques de `createAutoModerationReport` que vivían en
 * createPublication, preservando exactamente el mismo comportamiento.
 *
 * UBICACIÓN: src/services/api/publications.moderation.js
 * DEPENDENCIAS: NO importar desde publications.api.js (evitar circulares)
 */

import { supabase } from "@/services/supabase.client";
import { createAutoModerationReport } from "@/services/utils/moderationReports";
import { debugPublications } from "@/utils/debugLogger";

/**
 * Ejecuta un bloqueo duro de moderación cuando la imagen o el texto
 * contienen contenido restringido o indecente.
 *
 * Se llama ANTES de insertar la publicación en la BD.
 * Crea un reporte automático contra el usuario y retorna un error visible.
 *
 * @param {Object} user - Usuario autenticado (supabase.auth.getUser)
 * @param {Object} restrictedContentModeration - Resultado de detectRestrictedContentText
 * @param {Object} imageModeration - Resultado de detectIndecentImageByModeration
 * @returns {Promise<{ blocked: boolean, error?: string }>}
 */
export const runCreateModerationBlock = async (
  user,
  restrictedContentModeration,
  imageModeration,
) => {
  const reasons = [];

  if (restrictedContentModeration.flagged) {
    reasons.push(
      `Texto con contenido restringido: ${restrictedContentModeration.matches.join(", ")}`,
    );
  }
  if (imageModeration.flagged) {
    reasons.push(
      `${imageModeration.reason || "Imagen con contenido adulto/gore"} (confianza: ${imageModeration.confidence ?? "n/a"})`,
    );
  }

  debugPublications("runCreateModerationBlock:hard-block", { userId: user.id, reasons });

  await createAutoModerationReport({
    reportedType: "user",
    reportedId: user.id,
    reporterUserId: user.id,
    reportedUserId: user.id,
    reason: "offensive",
    description: `AUTO-MODERATION BLOCK (publication): ${reasons.join(" | ")}`,
  });

  return {
    blocked: true,
    error:
      "No se permitió publicar porque la imagen o el texto parecen contener contenido adulto/gore.",
  };
};

/**
 * Ejecuta la moderación automática suave DESPUÉS de insertar la publicación.
 * Oculta la publicación y crea un reporte automático cuando el texto
 * tiene lenguaje inapropiado (insultos, etc.).
 *
 * @param {Object} publication - Publicación recién creada (debe tener .id)
 * @param {Object} user - Usuario autenticado
 * @param {Object} textModeration - Resultado de detectInappropriateText
 * @param {Object} restrictedContentModeration - Resultado de detectRestrictedContentText
 * @param {Object} imageModeration - Resultado de detectIndecentImageByModeration
 * @returns {Promise<{ autoModerated: boolean }>}
 */
export const runCreateAutoModerate = async (
  publication,
  user,
  textModeration,
  restrictedContentModeration,
  imageModeration,
) => {
  const moderationDescriptionParts = [];

  if (textModeration.flagged) {
    moderationDescriptionParts.push(
      `Texto inapropiado detectado (score ${textModeration.score}/${textModeration.threshold}): ${textModeration.matches.map((m) => m.term).join(", ")}`,
    );
  }
  if (restrictedContentModeration.flagged) {
    moderationDescriptionParts.push(
      `Contenido restringido (adulto/gore) detectado: ${restrictedContentModeration.matches.join(", ")}`,
    );
  }
  if (imageModeration.flagged) {
    moderationDescriptionParts.push(
      `${imageModeration.reason || "Imagen potencialmente indecente detectada"} (confianza: ${imageModeration.confidence ?? "n/a"})`,
    );
  }

  debugPublications("runCreateAutoModerate:soft-hide", {
    publicationId: publication.id,
    userId: user.id,
    parts: moderationDescriptionParts.length,
  });

  await supabase
    .from("price_publications")
    .update({
      is_active: false,
      is_admin_hidden: true,
      hidden_admin_at: new Date().toISOString(),
      hidden_admin_by: user.id,
      hidden_admin_reason: "Moderación automática por contenido sensible",
    })
    .eq("id", publication.id);

  await createAutoModerationReport({
    reportedType: "publication",
    reportedId: publication.id,
    reporterUserId: user.id,
    reportedUserId: user.id,
    reason: "offensive",
    description: `AUTO-MODERATION: ${moderationDescriptionParts.join(" | ")}`,
  });

  return { autoModerated: true };
};
