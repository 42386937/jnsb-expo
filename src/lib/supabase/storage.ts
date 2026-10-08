import { File } from "expo-file-system";
import { supabase } from "./client";

// 头像 / 上报图片都放在这个桶里
const AVATAR_BUCKET = "jnsbCos";
const REPORT_BUCKET = "jnsbCos";

/** 待上传的图片：原生只有 uri，H5 还会带上 ImagePicker 给的 File 对象 */
export type ImageSource = {
  uri: string;
  file?: any;
  mimeType?: string | null;
};

// 从 uri / mimeType 推断文件后缀
const resolveExtension = (uri: string, mimeType?: string | null) => {
  const fromMime = mimeType?.split("/")[1]?.toLowerCase();
  if (fromMime) {
    return fromMime === "jpeg" ? "jpg" : fromMime;
  }

  const fromUri = uri.split("?")[0].split(".").pop()?.toLowerCase();
  return fromUri && fromUri.length <= 5 ? fromUri : "jpg";
};

/**
 * 通用图片上传，返回可直接访问的地址
 *
 * - 原生：expo-file-system 读取本地文件字节。RN 上必须传 ArrayBuffer / Uint8Array，
 *   传 Blob / File / FormData 都不生效（见 @supabase/storage-js 的 upload 说明）
 * - H5：expo-file-system 不支持 web，改用 ImagePicker 返回的 File 对象
 */
const uploadImage = async (bucket: string, path: string, image: ImageSource) => {
  const fileExtension = resolveExtension(image.uri, image.mimeType);
  const contentType =
    image.mimeType ??
    `image/${fileExtension === "jpg" ? "jpeg" : fileExtension}`;

  const body = image.file ?? (await new File(image.uri).bytes());

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
};

/** 上传头像到 jnsbCos，返回可直接访问的地址 */
export const uploadAvatar = async (userId: string, image: ImageSource) => {
  try {
    const fileExtension = resolveExtension(image.uri, image.mimeType);
    // 固定路径 + upsert：一个用户只有一个头像文件，不会越传越多
    const fileName = `avatar/${userId}/avatar.${fileExtension}`;
    const publicUrl = await uploadImage(AVATAR_BUCKET, fileName, image);

    // 路径固定，带时间戳避免 CDN / 浏览器缓存到旧头像
    return `${publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
};

/** 上传「一键上报」的问题图片到 jnsbCos，返回可直接访问的地址 */
export const uploadReportImage = async (userId: string, image: ImageSource) => {
  try {
    const fileExtension = resolveExtension(image.uri, image.mimeType);
    // 每次上报都是新图，路径带随机串避免撞名
    const fileName = `report/${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${fileExtension}`;

    return await uploadImage(REPORT_BUCKET, fileName, image);
  } catch (error) {
    console.error("Error uploading report image:", error);
    throw error;
  }
};

export const uploadProfileImage = async (userId: string, imageUri: string) => {
  try {
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}/profile.${fileExtension}`;
    const file = new File(imageUri);
    const bytes = await file.bytes();

    const { error } = await supabase.storage
      .from("profiles")
      .upload(fileName, bytes, {
        contentType: `image/${fileExtension}`,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("profiles")
      .getPublicUrl(fileName);

    return `${urlData.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
};

export const uploadPostImage = async (userId: string, imageUri: string) => {
  try {
    const fileExtension = imageUri.split(".").pop() || "jpg";
    const fileName = `${userId}/${Date.now()}.${fileExtension}`;
    const file = new File(imageUri);
    const bytes = await file.bytes();

    const { error } = await supabase.storage
      .from("posts")
      .upload(fileName, bytes, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("posts")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading post image:", error);
    throw error;
  }
};
