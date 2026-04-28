import * as Clipboard from "expo-clipboard";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import type { FriendPresence } from "@terri/shared";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useFriendSearch } from "@/features/friends/hooks/useFriendSearch";
import { formatPresenceUpdatedAt } from "@/features/friends/presence";
import { styles } from "./HomeMapScreen.styles";

type FriendsModalProps = {
  friends: FriendPresence[];
  onClose: () => void;
};

export function FriendsModal({ friends, onClose }: FriendsModalProps) {
  const inviteUrl = "https://app.link/share...xyz";
  const friendSearch = useFriendSearch();
  const copyInviteUrl = () => {
    void Clipboard.setStringAsync(inviteUrl);
  };
  const submitSearch = () => {
    void friendSearch.search();
  };

  return (
    <View style={styles.modal}>
      <View style={styles.decorCoral} />
      <View style={styles.decorMint} />
      <TouchableOpacity accessibilityLabel="友達画面を閉じる" accessibilityRole="button" hitSlop={12} onPress={onClose} style={styles.modalClose} testID="friends-close-button">
        <Text style={styles.modalCloseText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.modalTitle}>友達</Text>
      <View style={styles.search}>
        <TextInput
          accessibilityLabel="ユーザーIDで検索"
          autoCapitalize="characters"
          onChangeText={friendSearch.setQuery}
          onSubmitEditing={submitSearch}
          placeholder="ユーザーIDで検索"
          placeholderTextColor="#9A9698"
          returnKeyType="search"
          style={styles.searchInput}
          testID="friends-search-input"
          value={friendSearch.query}
        />
        <TouchableOpacity accessibilityLabel="友達を検索" accessibilityRole="button" onPress={submitSearch} style={styles.searchAction} testID="friends-search-button">
          <Text style={styles.searchIcon}>⌕</Text>
        </TouchableOpacity>
      </View>
      {friendSearch.errorMessage ? <Text style={styles.friendSearchMessage}>{friendSearch.errorMessage}</Text> : null}
      {friendSearch.status === "success" && friendSearch.results.length === 0 ? <Text style={styles.friendSearchMessage}>該当するユーザーはいません</Text> : null}
      {friendSearch.results.map((result) => {
        const disabled = result.requestStatus !== "none" || friendSearch.requestingFriendCode === result.friendCode;
        const label = result.requestStatus === "accepted" ? "友達" : result.requestStatus === "pending" ? "申請済み" : "追加";
        return (
          <View key={result.id} style={styles.friendSearchRow}>
            <Avatar initials={result.initials} color={result.color} size={54} />
            <View style={{ flex: 1 }}>
              <Text style={styles.friendSearchName}>{result.displayName}</Text>
              <Text style={styles.friendSearchCode}>{result.friendCode}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel={`${result.displayName}に友達申請`}
              accessibilityRole="button"
              disabled={disabled}
              onPress={() => void friendSearch.requestFriend(result.friendCode)}
              style={[styles.friendRequestButton, disabled ? styles.friendRequestButtonDisabled : null]}
              testID={`friend-request-${result.friendCode}`}
            >
              <Text style={styles.friendRequestButtonText} testID={`friend-request-label-${result.friendCode}`}>{label}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
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
        <Text style={styles.inviteUrl}>{inviteUrl}</Text>
        <TouchableOpacity accessibilityLabel="招待リンクをコピー" accessibilityRole="button" onPress={copyInviteUrl} style={styles.copyButton} testID="invite-copy-button">
          <Text style={styles.copyButtonText}>コピー</Text>
        </TouchableOpacity>
      </View>
      <PrimaryButton onPress={submitSearch} testID="friends-add-button">友達を検索</PrimaryButton>
    </View>
  );
}
