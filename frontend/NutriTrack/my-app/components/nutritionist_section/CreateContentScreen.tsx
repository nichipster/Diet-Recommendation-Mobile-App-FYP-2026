import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type CreateType = 'article' | 'tip' | 'advice';

export default function CreateContentScreen({
  type,
  onBack,
  onCreate,
  existingItem
}: {
  type: CreateType;
  onBack: () => void;
  onCreate: (item: any) => void;
  existingItem?: any;
}) {

  const [title, setTitle] = useState(existingItem?.title || '');
  const [content, setContent] = useState(
    type === 'tip'
      ? existingItem?.text?.replace('💡 ', '') || ''
      : existingItem?.preview || existingItem?.desc || ''
  );
  const [author, setAuthor] = useState(existingItem?.author || '');

  const handleSubmit = () => {
    let newItem;

    if (type === 'article') {
      newItem = {
        id: existingItem?.id || Date.now().toString(),
        title,
        preview: content.slice(0, 80) + '...', // short preview
        content: content, // FULL content
        date: existingItem?.date || new Date().toDateString(),
        author,
        category: existingItem?.category || 'Education'
      };
    }

    if (type === 'tip') {
      newItem = {
        id: existingItem?.id || Date.now().toString(),
        text: `💡 ${content}`,
        author,
        category: existingItem?.category || 'Education'  
      };
    }

    if (type === 'advice') {
      newItem = {
        id: existingItem?.id || Date.now().toString(),
        title,
        desc: content,
        author,
        category: existingItem?.category || 'Education'
      };
    }

    if (newItem) {
      onCreate(newItem);
      onBack();
    }
  };

  return (
      <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {existingItem ? 'Edit' : 'Create'} {type}
        </Text>
      </View>

      {(type === 'article' || type === 'advice') && (
        <TextInput
          placeholder="Enter title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
      )}

      <TextInput
        placeholder="Enter content..."
        value={content}
        onChangeText={setContent}
        style={[styles.input, { height: 120 }]}
        multiline
        placeholderTextColor="#9ca3af"
      />

      <TextInput
        placeholder="Author name (e.g. Dr. Aisha)"
        value={author}
        onChangeText={setAuthor}
        style={styles.input}
        placeholderTextColor="#9ca3af"
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },

  back: { color: '#10b981', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700' },

  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12
  },

  button: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center'
  },

  buttonText: { color: '#fff', fontWeight: '700' }
});