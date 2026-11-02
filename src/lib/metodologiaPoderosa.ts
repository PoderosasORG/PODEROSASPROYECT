// src/lib/metodologiaPoderosa.ts
export type CourseCategory = {
  id: string;
  product_id: string;
  owner_id: string;
  title: string;
  order_index: number;
};

export type CategoryModule = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  bunny_video_id: string | null;
  custom_thumbnail_url: string | null;
  order_index: number;
  is_published: boolean;
};

export type CategoryModuleFile = {
  id: string;
  module_id: string;
  file_path: string;
  file_name: string;
};
