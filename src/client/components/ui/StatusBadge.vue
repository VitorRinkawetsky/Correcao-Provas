<script setup>
import { computed } from 'vue';

import { statusLabels, statusTones } from '../../data/mockData';

const props = defineProps({
    status: {
        type: String,
        required: true
    },
    label: {
        type: String,
        default: ''
    }
});

const text = computed(() => props.label || statusLabels[props.status] || props.status);
const tone = computed(() => statusTones[props.status] || 'neutral');
</script>

<template>
    <span class="badge" :class="`badge--${tone}`">{{ text }}</span>
</template>
