import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { LocationMode } from '@skill-exchange/shared-types';
import { Globe, MapPin, Layers } from 'lucide-react-native';

interface LocationPickerProps {
  mode: LocationMode;
  onModeChange: (mode: LocationMode) => void;
  meetingLink: string;
  onMeetingLinkChange: (val: string) => void;
  locationAddress: string;
  onLocationAddressChange: (val: string) => void;
  meetingLinkError?: string | null;
  locationAddressError?: string | null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  mode,
  onModeChange,
  meetingLink,
  onMeetingLinkChange,
  locationAddress,
  onLocationAddressChange,
  meetingLinkError,
  locationAddressError,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>SESSION LOCATION MODE</Text>

      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, mode === LocationMode.ONLINE && styles.segmentBtnActive]}
          onPress={() => onModeChange(LocationMode.ONLINE)}
          activeOpacity={0.8}
        >
          <Globe size={16} color={mode === LocationMode.ONLINE ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentText, mode === LocationMode.ONLINE && styles.segmentTextActive]}>
            Online
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, mode === LocationMode.OFFLINE && styles.segmentBtnActive]}
          onPress={() => onModeChange(LocationMode.OFFLINE)}
          activeOpacity={0.8}
        >
          <MapPin size={16} color={mode === LocationMode.OFFLINE ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentText, mode === LocationMode.OFFLINE && styles.segmentTextActive]}>
            Offline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, mode === LocationMode.HYBRID && styles.segmentBtnActive]}
          onPress={() => onModeChange(LocationMode.HYBRID)}
          activeOpacity={0.8}
        >
          <Layers size={16} color={mode === LocationMode.HYBRID ? '#38BDF8' : '#94A3B8'} style={{ marginRight: 6 }} />
          <Text style={[styles.segmentText, mode === LocationMode.HYBRID && styles.segmentTextActive]}>
            Hybrid
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conditional Inputs */}
      {(mode === LocationMode.ONLINE || mode === LocationMode.HYBRID) && (
        <View style={styles.inputGroup}>
          <Text style={styles.subLabel}>Meeting Link (Google Meet, Zoom, etc.)</Text>
          <TextInput
            style={[styles.input, meetingLinkError ? styles.inputError : null]}
            placeholder="https://meet.google.com/xyz-abc"
            placeholderTextColor="#64748B"
            value={meetingLink}
            onChangeText={onMeetingLinkChange}
            autoCapitalize="none"
            keyboardType="url"
          />
          {meetingLinkError ? <Text style={styles.errorText}>{meetingLinkError}</Text> : null}
        </View>
      )}

      {(mode === LocationMode.OFFLINE || mode === LocationMode.HYBRID) && (
        <View style={styles.inputGroup}>
          <Text style={styles.subLabel}>Campus Location / Room Address</Text>
          <TextInput
            style={[styles.input, locationAddressError ? styles.inputError : null]}
            placeholder="Library 3rd Floor, Study Pod B"
            placeholderTextColor="#64748B"
            value={locationAddress}
            onChangeText={onLocationAddressChange}
          />
          {locationAddressError ? <Text style={styles.errorText}>{locationAddressError}</Text> : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#1E293B',
    borderColor: '#38BDF8',
    borderWidth: 1,
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  inputGroup: {
    marginTop: 10,
  },
  subLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
  },
});
