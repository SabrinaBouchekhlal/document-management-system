package com.docvault.esb.config;

import com.docvault.shared.events.CommentEvent;
import com.docvault.shared.events.DocumentEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class EsbConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    private Map<String, Object> baseConsumerProps(String groupId) {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.docvault.shared.events");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        return props;
    }

    @Bean
    public ConsumerFactory<String, DocumentEvent> documentEventConsumerFactory() {
        Map<String, Object> props = baseConsumerProps("esb-document-group");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, DocumentEvent.class.getName());
        return new DefaultKafkaConsumerFactory<>(props,
                new StringDeserializer(),
                new JsonDeserializer<>(DocumentEvent.class, false));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, DocumentEvent> documentKafkaListenerContainerFactory(
            ConsumerFactory<String, DocumentEvent> documentEventConsumerFactory) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, DocumentEvent>();
        factory.setConsumerFactory(documentEventConsumerFactory);
        factory.setConcurrency(2);
        return factory;
    }

    @Bean
    public ConsumerFactory<String, CommentEvent> commentEventConsumerFactory() {
        Map<String, Object> props = baseConsumerProps("esb-comment-group");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(props,
                new StringDeserializer(),
                new JsonDeserializer<>(CommentEvent.class, false));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, CommentEvent> commentKafkaListenerContainerFactory(
            ConsumerFactory<String, CommentEvent> commentEventConsumerFactory) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, CommentEvent>();
        factory.setConsumerFactory(commentEventConsumerFactory);
        factory.setConcurrency(1);
        return factory;
    }

    @Bean
    public RedisTemplate<String, String> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, String> t = new RedisTemplate<>();
        t.setConnectionFactory(factory);
        t.setKeySerializer(new StringRedisSerializer());
        t.setValueSerializer(new StringRedisSerializer());
        return t;
    }
}
