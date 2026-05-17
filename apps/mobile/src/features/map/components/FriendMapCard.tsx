import { Text, TouchableOpacity, View } from "react-native";
import type { MapFriendMarker } from "@/components/map/mapTypes";
import { Avatar } from "@/components/ui/Avatar";
import { styles } from "./HomeMapScreen.styles";

type FriendMapCardProps = {
  friend: MapFriendMarker;
  onClose: () => void;
};

export function FriendMapCard({ friend, onClose }: FriendMapCardProps) {
  return (
    <View style={styles.friendMapCard} testID="friend-map-card">
      <Avatar initials={friend.initials} color={friend.color} size={58} active={friend.isActive} />
      <View style={styles.friendMapCardBody}>
        <Text style={styles.friendMapCardName}>{friend.displayName}</Text>
        <Text style={styles.friendMapCardMeta}>{friend.isActive ? "今アクティブ🔥" : friend.updatedLabel}</Text>
        <Text style={styles.friendMapCardArea}>{friend.totalAreaKm2.toFixed(1)} km² 獲得中</Text>
      </View>
      <TouchableOpacity accessibilityLabel="友達カードを閉じる" accessibilityRole="button" onPress={onClose} style={styles.friendMapCardClose} testID="friend-map-card-close-button">
        <Text style={styles.friendMapCardCloseText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}
