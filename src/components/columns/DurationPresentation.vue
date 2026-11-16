<template>
    <span :class="['duration-value', { 'duration-running': isRunning }]">
        <span class="duration-text" :title="isRunning ? t('batch-running') : undefined">{{ formattedDuration }}</span>
    </span>
</template>

<script lang="ts" setup>
import { computed, inject } from 'vue';
import { formatDuration } from '@/utils/columnUtils';

const t = inject('t') as (key: string) => string;

const props = defineProps({
    value: {
        type: Number,
        required: true,
    },
    isRunning: {
        type: Boolean,
        default: false,
    }
});

const formattedDuration = computed(() => {
    return formatDuration(props.value);
});
</script>

<style scoped>
.duration-value {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
}

.duration-text {
    font-variant-numeric: tabular-nums;
}

.duration-running {
    color: #4b5563;
    font-weight: 600;
}

.duration-running::before {
    content: '';
    width: 0.45rem;
    height: 0.45rem;
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
        box-shadow: 0 0 0 0 rgba(21, 101, 192, 0);
    }
}
</style>
