import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate 
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const { height } = Dimensions.get('window');

interface RideOption {
  id: string;
  title: string;
  price: number;
  time: string;
  icon: string; // Nom de l'icône désormais
}

interface RideSelectorProps {
  options: RideOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  isVisible: boolean;
}

const RideSelector: React.FC<RideSelectorProps> = ({ options, selectedId, onSelect, onConfirm, isVisible }) => {
  const translateY = useSharedValue(height);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 15 });
    } else {
      translateY.value = withSpring(height);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.handle} />
      <Text style={styles.title}>Choisissez votre trajet</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            style={[
              styles.card,
              selectedId === option.id && styles.selectedCard,
            ]}
            onPress={() => onSelect(option.id)}
          >
            <View style={styles.iconContainer}>
              <Icon name={option.icon} size={40} color={selectedId === option.id ? COLORS.PRIMARY : '#333'} />
            </View>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.time}>{option.time}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(option.price)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.paymentMethod}>
          <Icon name="cash-outline" size={20} color="#333" style={{ marginRight: 8 }} />
          <Text style={styles.paymentText}>Espèces</Text>
        </View>
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmButtonText}>COMMANDER</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    color: COLORS.SECONDARY,
    paddingHorizontal: 20,
  },
  scroll: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  card: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F5F5F5',
    marginRight: 12,
    backgroundColor: '#FAFAFA',
  },
  selectedCard: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: '#FFF',
    elevation: 4,
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.SECONDARY,
  },
  time: {
    fontSize: 13,
    color: COLORS.GRAY,
    marginBottom: 10,
  },
  priceContainer: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
  footer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    marginRight: 15,
  },
  paymentIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.SECONDARY,
  },
  confirmButton: {
    backgroundColor: COLORS.PRIMARY,
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
});

export default RideSelector;
