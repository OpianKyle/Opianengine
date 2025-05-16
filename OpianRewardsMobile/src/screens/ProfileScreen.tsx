import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Divider, Button, TextInput, Avatar, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../services/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    address: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveProfile = () => {
    // Would implement API call to update profile here
    Alert.alert('Success', 'Profile updated successfully');
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Avatar.Text 
            size={80} 
            label={getInitials(user)} 
            color="#FFF" 
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              {!editing && (
                <Button 
                  mode="text" 
                  onPress={() => setEditing(true)}
                  textColor="#022b5c"
                >
                  Edit
                </Button>
              )}
            </View>
            <Divider style={styles.divider} />

            {editing ? (
              <View style={styles.editForm}>
                <TextInput
                  label="First Name"
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({...formData, firstName: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({...formData, lastName: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Email"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <TextInput
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
                
                <TextInput
                  label="Address"
                  value={formData.address}
                  onChangeText={(text) => setFormData({...formData, address: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Suburb"
                  value={formData.suburb}
                  onChangeText={(text) => setFormData({...formData, suburb: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="City"
                  value={formData.city}
                  onChangeText={(text) => setFormData({...formData, city: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Province"
                  value={formData.province}
                  onChangeText={(text) => setFormData({...formData, province: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <TextInput
                  label="Postal Code"
                  value={formData.postalCode}
                  onChangeText={(text) => setFormData({...formData, postalCode: text})}
                  mode="outlined"
                  style={styles.input}
                />
                
                <View style={styles.buttonRow}>
                  <Button 
                    mode="outlined" 
                    onPress={() => setEditing(false)}
                    style={[styles.button, styles.cancelButton]}
                  >
                    Cancel
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={handleSaveProfile}
                    style={[styles.button, styles.saveButton]}
                  >
                    Save
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.infoContainer}>
                <InfoItem label="First Name" value={user?.firstName || 'Not set'} />
                <InfoItem label="Last Name" value={user?.lastName || 'Not set'} />
                <InfoItem label="Email" value={user?.email || 'Not set'} />
                <InfoItem label="Phone" value={user?.phoneNumber || 'Not set'} />
                {/* Additional fields would be displayed here */}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Account Information</Text>
            <Divider style={styles.divider} />
            
            <InfoItem label="Member Since" value="May 2025" />
            <InfoItem label="Subscription" value="OPPORTUNITY" />
            <InfoItem label="Points Balance" value={`${user?.points || 0} points`} />
            <InfoItem label="Referral Code" value={user?.referralCode || 'Not set'} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Settings</Text>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Change Password"
              left={props => <List.Icon {...props} icon="lock-reset" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => alert('Change Password functionality would go here')}
            />
            
            <List.Item
              title="Notification Preferences"
              left={props => <List.Icon {...props} icon="bell-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => alert('Notification Preferences would go here')}
            />
            
            <List.Item
              title="Privacy Settings"
              left={props => <List.Icon {...props} icon="shield-account" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => alert('Privacy Settings would go here')}
            />
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#e53935"
        >
          Log Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for displaying info items
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Helper function to get user's initials for the avatar
function getInitials(user: any): string {
  if (!user) return 'OP';
  const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
  const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
  return (firstInitial + lastInitial).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    backgroundColor: '#022b5c',
    marginBottom: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 10,
  },
  infoContainer: {
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    color: '#666',
  },
  infoValue: {
    fontWeight: '500',
  },
  editForm: {
    marginTop: 10,
  },
  input: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
    backgroundColor: '#022b5c',
  },
  logoutButton: {
    marginVertical: 20,
  },
});