import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

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
        author
      };
    }

    if (type === 'tip') {
      newItem = {
        id: existingItem?.id || Date.now().toString(),
        text: `💡 ${content}`,
        author
      };
    }

    if (type === 'advice') {
      newItem = {
        id: existingItem?.id || Date.now().toString(),
        title,
        desc: content,
        author
      };
    }

    if (newItem) {
      onCreate(newItem);
      onBack();
    }
  };

  return (
    <View style={styles.container}>

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
        />
      )}

      <TextInput
        placeholder="Enter content..."
        value={content}
        onChangeText={setContent}
        style={[styles.input, { height: 120 }]}
        multiline
      />

      <TextInput
        placeholder="Author name (e.g. Dr. Aisha)"
        value={author}
        onChangeText={setAuthor}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>

    </View>
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