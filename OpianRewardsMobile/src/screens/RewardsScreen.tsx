import React from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../services/auth';

export default function RewardsScreen() {
  const { user } = useAuth();
  const userPoints = user?.points || 0;

  const rewards = [
    {
      id: 1,
      title: 'Shopping Voucher',
      description: 'R500 shopping voucher for any participating retail store',
      pointsCost: 5000,
      category: 'Vouchers',
      image: require('../../assets/placeholder-reward.png')
    },
    {
      id: 2,
      title: 'Wellness Discount',
      description: '25% discount on your next wellness treatment',
      pointsCost: 3000,
      category: 'Health',
      image: require('../../assets/placeholder-reward.png')
    },
    {
      id: 3,
      title: 'Movie Tickets',
      description: 'Two free movie tickets at any cinema nationwide',
      pointsCost: 2500,
      category: 'Entertainment',
      image: require('../../assets/placeholder-reward.png')
    },
    {
      id: 4,
      title: 'Restaurant Voucher',
      description: 'R250 voucher at participating restaurants',
      pointsCost: 2000,
      category: 'Dining',
      image: require('../../assets/placeholder-reward.png')
    },
    {
      id: 5,
      title: 'Online Course Discount',
      description: '50% off any online course from our education partners',
      pointsCost: 4000,
      category: 'Education',
      image: require('../../assets/placeholder-reward.png')
    }
  ];

  const handleRedeemReward = (reward: any) => {
    if (userPoints < reward.pointsCost) {
      Alert.alert(
        'Insufficient Points',
        `You need ${reward.pointsCost - userPoints} more points to redeem this reward.`
      );
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Are you sure you want to redeem ${reward.title} for ${reward.pointsCost} points?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Redeem',
          onPress: () => {
            // Would implement API call to redeem reward here
            Alert.alert('Success', `You have successfully redeemed ${reward.title}!`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rewards</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Summary */}
        <Card style={styles.pointsCard}>
          <Card.Content>
            <Text style={styles.pointsLabel}>Available Points</Text>
            <Text style={styles.pointsValue}>{userPoints}</Text>
          </Card.Content>
        </Card>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              selected 
              onPress={() => {}}
            >
              All
            </Chip>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              onPress={() => {}}
            >
              Vouchers
            </Chip>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              onPress={() => {}}
            >
              Health
            </Chip>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              onPress={() => {}}
            >
              Entertainment
            </Chip>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              onPress={() => {}}
            >
              Dining
            </Chip>
            <Chip 
              mode="outlined" 
              style={styles.categoryChip} 
              onPress={() => {}}
            >
              Education
            </Chip>
          </ScrollView>
        </View>

        <Divider style={styles.divider} />

        {/* Rewards List */}
        <Text style={styles.sectionTitle}>Available Rewards</Text>

        {rewards.map(reward => (
          <Card key={reward.id} style={styles.rewardCard}>
            <View style={styles.rewardImageContainer}>
              <Image 
                source={reward.image} 
                style={styles.rewardImage} 
                resizeMode="cover" 
              />
              <Chip style={styles.categoryTag}>{reward.category}</Chip>
            </View>
            <Card.Content style={styles.rewardContent}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
              <View style={styles.rewardFooter}>
                <Text style={styles.rewardPoints}>{reward.pointsCost} points</Text>
                <Button 
                  mode="contained" 
                  style={[
                    styles.redeemButton,
                    userPoints < reward.pointsCost && styles.disabledButton
                  ]}
                  disabled={userPoints < reward.pointsCost}
                  onPress={() => handleRedeemReward(reward)}
                >
                  Redeem
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#022b5c',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    padding: 16,
  },
  pointsCard: {
    marginBottom: 16,
    backgroundColor: '#022b5c',
  },
  pointsLabel: {
    fontSize: 16,
    color: 'white',
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  categoriesContainer: {
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rewardCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  rewardImageContainer: {
    position: 'relative',
  },
  rewardImage: {
    width: '100%',
    height: 150,
  },
  categoryTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  rewardContent: {
    paddingVertical: 12,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  rewardDescription: {
    marginVertical: 8,
    color: '#666',
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#022b5c',
  },
  redeemButton: {
    backgroundColor: '#022b5c',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});