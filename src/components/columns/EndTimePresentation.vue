<template>
    <span v-if="isActiveBatch" class="end-time-running">
        {{ t('batch-running') }}
    </span>
    <span v-else>{{ formattedValue }}</span>
</template>

<script lang="ts" setup>
import { computed, inject, type PropType } from 'vue';
import type { DisplayFormat } from '@/types/BatchGrid';
import { formatDateTime } from '@/utils/columnUtils';
import { isActiveBatchEndTime } from '@/utils/timeUtils';

const t = inject('t') as (key: string) => string;

const props = defineProps({
    value: {
        type: String,
        required: true
    },
    displayFormat: {
        type: Object as PropType<DisplayFormat>,
        required: false
    }
});

const isActiveBatch = computed(() => {
    return isActiveBatchEndTime(props.value);
});

const formattedValue = computed(() => {
    if (props.value == null) {
        return '';
    }

    return formatDateTime(props.value, props.displayFormat);
});
</script>

<style scoped>
.end-time-running {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-weight: 600;
    color: #4b5563;
    background: rgba(107, 114, 128, 0.12);
    border-radius: 9999px;
    padding: 0.14rem 0.5rem;
    line-height: 1;
}

.end-time-running::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: #6b7280;
    box-shadow: 0 0 0 0 rgba(107, 114, 128, 0.5);
    animation: pulse-running 1.8s ease-out infinite;
}

@keyframes pulse-running {
    0% {
        box-shadow: 0 0 0 0 rgba(107, 114, 128, 0.5);
    }

    70% {
        box-shadow: 0 0 0 0.45rem rgba(107, 114, 128, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(46, 125, 50, 0);
    }
}
</style>