import { Text, TouchableOpacity, View } from "react-native";
import type { FriendPresence } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { formatPresenceUpdatedAt } from "@/features/friends/presence";
import { styles } from "./HomeMapScreen.styles";

type FriendsModalProps = {
  friends: FriendPresence[];
  onClose: () => void;
};

export function FriendsModal({ friends, onClose }: FriendsModalProps) {
  return (
    <View style={styles.modal}>
      <View style={styles.decorCoral} />
      <View style={styles.decorMint} />
      <TouchableOpacity onPress={onClose} style={styles.modalClose}>
        <Text style={styles.modalCloseText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.modalTitle}>友達</Text>
      <View style={styles.search}>
        <Text style={styles.searchText}>ユーザーIDで検索</Text>
        <Text style={styles.searchIcon}>⌕</Text>
      </View>
      {friends.slice(0, 3).map((friend) => (
        <View key={friend.id} style={styles.friendRow}>
          <Avatar initials={friend.initials} color={friend.color} size={72} active={friend.isActive} />
          <View style={{ flex: 1 }}>
            <Text style={styles.friendName}>{friend.displayName}</Text>
            <View style={styles.friendPills}>
              <Pill>{friend.totalAreaKm2.toFixed(1)} km²</Pill>
              <Pill tone={friend.locationSharingEnabled ? "mint" : "neutral"}>{formatPresenceUpdatedAt(friend)}</Pill>
            </View>
          </View>
          <View style={styles.friendMap}>
            <Text style={{ fontSize: 30 }}>📍</Text>
          </View>
        </View>
      ))}
      <Text style={styles.inviteTitle}>招待リンク</Text>
      <View style={styles.inviteBox}>
        <Text style={styles.inviteUrl}>https://app.link/share...xyz</Text>
        <Text style={styles.copyButton}>コピー</Text>
      </View>
      <PrimaryButton onPress={onClose}>👋 友達を追加</PrimaryButton>
    </View>
  );
}
