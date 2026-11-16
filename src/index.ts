import BatchGrid from "@/components/BatchGrid.vue";

const dcpComponents = {
  BatchGrid
};

export default {
  install(app: any) {
    for (const [name, component] of Object.entries(dcpComponents)) {
      app.component(name, component);
    }
  },
};

export {
  BatchGrid
};

export type {
  EventframeContextValue,
  EventframeContext,
  AttributeSettings,
  DynamicValueLoadContext,
  DynamicValueBatchLoader,
  ValueColumnDef,
  ValueColumnSection
} from '@/types/BatchGrid';
export { inferColumnType, formatDuration, formatDateTime } from '@/utils/columnUtils';
export { AttributeSettingValueType } from '@/enums/AttributeSettingValueType';