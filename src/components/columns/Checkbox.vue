<template>
    <v-icon :class="['pointer', { 'checkbox-disabled': row.disabled }]" @click="handleClick">
        {{ row.selected ? 'mdi-checkbox-marked-outline' : 'mdi-checkbox-blank-outline' }}
    </v-icon>
</template>

<script lang="ts" setup>
const props = defineProps({
    row: {
        type: Object,
        required: true
    }
});

const emit = defineEmits<{
    (e: 'updateRow', payload: { row: any; shiftKey: boolean }): void;
}>();

const handleClick = (event: MouseEvent) => {
    if (props.row.disabled) {
        return;
    }
    emit('updateRow', {
        row: props.row,
        shiftKey: event.shiftKey,
    });
};
</script>

<style scoped>
.checkbox-disabled {
    color: #ccc !important;
    cursor: not-allowed !important;
    opacity: 0.5;
}
</style>